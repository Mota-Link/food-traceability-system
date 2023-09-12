#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
mod types;

#[frame_support::pallet]
pub mod pallet {
	use super::types::*;
	use chrono::naive::Days;
	use chrono::prelude::*;
	use codec::alloc::string::String;
	use codec::alloc::string::ToString;
	use core::ops::Add;
	use frame_support::dispatch::Vec;
	use frame_support::pallet_prelude::*;
	use frame_support::traits::UnixTime;
	use frame_system::pallet_prelude::*;
	// use sp_runtime::offchain::http::Request;
	// use sp_core::Bytes;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_timestamp::Config {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
	}

	/// 食品持有项
	#[pallet::storage]
	#[pallet::unbounded]
	// #[pallet::getter(fn food_item_trace)]
	pub type FoodItem<T: Config> = StorageDoubleMap<
		_,
		Blake2_128Concat,
		(BarCode, GLN, GLN), // 产品条码, 所有者 GLN, 当前位置 GLN
		Blake2_128Concat,
		u8,           // 防碰撞 nonce
		(u128, Hash), // 数量 + 痕迹链头
	>;

	/// 食品痕迹链
	#[pallet::storage]
	pub type FoodTrace<T: Config> = StorageMap<_, Twox64Concat, Hash, (TraceEvent, Option<Hash>)>;

	/// 食品原料
	#[pallet::storage]
	#[pallet::unbounded]
	pub type FoodMaterials<T: Config> = StorageMap<_, Blake2_128Concat, BarCode, Vec<Material>>;

	/// 账户 GLN
	#[pallet::storage]
	pub type AccountGLN<T: Config> = StorageMap<_, Twox64Concat, T::AccountId, GLN>;

	/// GLN 生产许可
	#[pallet::storage]
	pub type ManufacturerLicense<T: Config> = StorageMap<_, Blake2_128Concat, GLN, License>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		FoodProduced(BarCode, TraceEvent),
		FoodTraded(BarCode, TraceEvent),
		FoodStored(BarCode, TraceEvent),
		FoodTransported(BarCode, TraceEvent),
		AccountGlnSet(T::AccountId, GLN),
		ManufacturerLicenseSet(GLN, License),
		ManufacturerLicenseUnset(GLN),
	}

	#[pallet::error]
	pub enum Error<T> {
		AmountZeroError,           // 数量为 0
		AmountSingleItemError,     // 单品级食品数量不为 1
		BarCodeTooShort,           // 条形码太短
		BarCodeDuplicated,         // 条形码重复
		BarCodeUnexpectIdentifier, // 条形码标识符错误
		CodeVerificationFailed,    // 校验码验证失败
		ConversionError,           // 类型转换错误
		GLNLenError,               // GLN长度错误
		GLNFormatError,            // GLN格式错误
		GlnNotExist,               // GLN 不存在
		GlnAlreadySet,             // 账户已设置 GLN
		GetTimeError,              // 获取时间失败
		InsufficientInventory,     // 库存不足
		LicenseVerificationFailed, // 许可证验证失败
		LicenseLenError,           // 许可证长度错误
		LicenseFormatError,        // 许可证格式错误
		ManufacturerNoLicense,     // 生产商无证
		NoRootPrivileges,          // 无 root 权限
		SSCCLenError,              // SSCC长度错误
		SSCCFormatError,           // SSCC格式错误
		ShelfLifeVerifyFail,       // 保质期验证失败
		TransactionUnsign,         // 交易未签名
		UseUnexpectCharacter,      // 使用错误字符
		                           // HttpPendingError,
		                           // HttpResponseError,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// 生产食品
		#[pallet::call_index(0)]
		#[pallet::weight((Weight::default(), Pays::No))]
		pub fn produce_food(
			origin: OriginFor<T>,
			raw_bar_code: Vec<u8>,
			manufacturer: Id<T::AccountId>,
			amount: u128,
			unit: CountUnit,
			shelf_life_days: u16,
			materials: Vec<(Vec<u8>, u128)>,
		) -> DispatchResult {
			// 初始化并校验元数据
			let (owner, time) = Pallet::<T>::get_metadata(origin)?;
			let manufacturer = Pallet::<T>::get_gln(manufacturer)?;
			let manufacturer_license = ManufacturerLicense::<T>::get(&manufacturer)
				.ok_or(Error::<T>::ManufacturerNoLicense)?;
			let bar_code = Pallet::<T>::parse_bar_code(&raw_bar_code)?;
			Pallet::<T>::verify_amount(&amount, &bar_code)?;
			let identity = (bar_code, owner, manufacturer);

			// 判断是否已经生产过了
			if FoodMaterials::<T>::contains_key(&bar_code) {
				Err(Error::<T>::BarCodeDuplicated)?;
			}
			FoodMaterials::<T>::insert(&bar_code, Vec::<Material>::new());

			// 消耗并记录每一份原料
			for (raw_bar_code, mut amount) in materials.iter() {
				// 格式化元数据
				let material_bar_code = Pallet::<T>::parse_bar_code(&raw_bar_code)?;
				let identity = (material_bar_code, owner, manufacturer);
				let mut nonce = Pallet::<T>::get_max_nonce(&identity);
				Pallet::<T>::verify_shelf_life(&identity, &time)?;

				// 优先消耗 nonce 值最大的库存
				// 若所需要的量不够，则继续消耗
				while amount > 0 {
					// 当前已没有可消耗的项，返回【库存不足】错误
					if nonce == 0 {
						Err(Error::<T>::InsufficientInventory)?;
					}

					nonce -= 1;

					let (item, hash) = FoodItem::<T>::get(&identity, nonce).unwrap();
					if item > amount {
						// 该项数量比需要的更多，消耗完还有剩余
						FoodItem::<T>::insert(&identity, nonce, &(item - amount, hash));
						amount = 0;
					} else {
						// 该项数量完全消耗
						FoodItem::<T>::remove(&identity, nonce);
						amount -= item;
					}
					// 记录原料
					FoodMaterials::<T>::append(&bar_code, Material(material_bar_code, hash));
				}
			}

			let food_trace = TraceEvent::Produce {
				manufacturer,
				manufacturer_license,
				unit,
				shelf_life_days,
				time,
			};
			let hash = Pallet::<T>::get_hash(&bar_code);
			FoodTrace::<T>::insert(&hash, &(food_trace, None));
			FoodItem::<T>::insert(&identity, 0, &(amount, hash));

			Self::deposit_event(Event::FoodProduced(bar_code, food_trace));
			Ok(())
		}

		/// 交易食品
		#[pallet::call_index(1)]
		#[pallet::weight((Weight::default(), Pays::No))]
		pub fn trade_food(
			origin: OriginFor<T>,
			raw_bar_code: Vec<u8>,
			locate: Id<T::AccountId>,
			buyer: Id<T::AccountId>,
			mut amount: u128,
		) -> DispatchResult {
			// 初始化并校验元数据
			let (seller, time) = Pallet::<T>::get_metadata(origin)?;
			let locate = Pallet::<T>::get_gln(locate)?;
			let buyer = Pallet::<T>::get_gln(buyer)?;
			let bar_code = Pallet::<T>::parse_bar_code(&raw_bar_code)?;
			Pallet::<T>::verify_amount(&amount, &bar_code)?;
			let seller_identity = (bar_code, seller, locate);
			Pallet::<T>::verify_shelf_life(&seller_identity, &time)?;
			let buyer_identity = (bar_code, buyer, locate);

			let food_trace = TraceEvent::Trade { seller, buyer, time };

			let mut seller_nonce = Pallet::<T>::get_max_nonce(&seller_identity);
			let mut buyer_nonce = Pallet::<T>::get_max_nonce(&buyer_identity);

			// 优先交易 nonce 值较大的库存
			// 若所需要的量不够，则继续消耗
			while amount > 0 {
				if seller_nonce == 0 {
					Err(Error::<T>::InsufficientInventory)?;
				}

				seller_nonce -= 1;

				// 先存入食品痕迹，再将痕迹索引键关联到食品项
				let (item, hash) = FoodItem::<T>::get(&seller_identity, seller_nonce).unwrap();
				let new_hash = Pallet::<T>::get_hash(&(food_trace, hash));
				FoodTrace::<T>::insert(&new_hash, &(food_trace, Some(hash)));

				if item > amount {
					// 该项数量比需要的更多，消耗完还有剩余
					FoodItem::<T>::insert(&seller_identity, seller_nonce, &(item - amount, hash));
					FoodItem::<T>::insert(&buyer_identity, buyer_nonce, &(amount, new_hash));
					amount = 0;
				} else {
					// 该项数量完全消耗
					FoodItem::<T>::remove(&seller_identity, seller_nonce);
					FoodItem::<T>::insert(&buyer_identity, buyer_nonce, &(item, new_hash));
					amount -= item;
				}

				buyer_nonce += 1;
			}

			Self::deposit_event(Event::FoodTraded(bar_code, food_trace));
			Ok(())
		}

		/// 存储食物
		#[pallet::call_index(2)]
		#[pallet::weight((Weight::default(), Pays::No))]
		pub fn store_food(
			origin: OriginFor<T>,
			raw_bar_code: Vec<u8>,
			warehouse: Id<T::AccountId>,
			sscc: Vec<u8>,
			mut amount: u128,
		) -> DispatchResult {
			// 初始化并校验元数据
			let (owner, time) = Pallet::<T>::get_metadata(origin)?;
			let warehouse = Pallet::<T>::get_gln(warehouse)?;
			let sscc = Pallet::<T>::parse_sscc(&sscc)?;
			let bar_code = Pallet::<T>::parse_bar_code(&raw_bar_code)?;
			Pallet::<T>::verify_amount(&amount, &bar_code)?;
			let identity = (bar_code, owner, warehouse);
			Pallet::<T>::verify_shelf_life(&identity, &time)?;

			let food_trace = TraceEvent::Store { warehouse, sscc, time };

			let mut nonce = 0u8;
			let max_nonce = Pallet::<T>::get_max_nonce(&identity);

			// 优先存储 nonce 值较小的库存，
			// 使其他方法总是优先消耗未储存的项。
			while amount > 0 {
				if nonce == max_nonce {
					return Err(Error::<T>::InsufficientInventory.into());
				}

				// 若已经存储，则跳过该项
				let (item, hash) = FoodItem::<T>::get(&identity, nonce).unwrap();
				if let TraceEvent::Store { .. } = FoodTrace::<T>::get(&hash).unwrap().0 {
					continue;
				};

				// 先存入食品痕迹，再将痕迹索引键关联到食品项
				let new_hash = Pallet::<T>::get_hash(&(food_trace, hash));
				FoodTrace::<T>::insert(&new_hash, &(food_trace, Some(hash)));

				if item > amount {
					// 该项数量比需要的更多，存储完还有剩余
					FoodItem::<T>::insert(&identity, nonce, &(amount, new_hash));
					FoodItem::<T>::insert(&identity, max_nonce, &(item - amount, hash));
					amount = 0;
				} else {
					// 该项数量完全存储
					FoodItem::<T>::insert(&identity, nonce, &(item, new_hash));
					amount -= item;
				}
				nonce += 1;
			}

			Self::deposit_event(Event::FoodStored(bar_code, food_trace));

			Ok(())
		}

		/// 运输食物
		#[pallet::call_index(3)]
		#[pallet::weight((Weight::default(), Pays::No))]
		pub fn transport_food(
			origin: OriginFor<T>,
			raw_bar_code: Vec<u8>,
			origin_gln: Id<T::AccountId>,
			destination_gln: Id<T::AccountId>,
			carrier_gln: Id<T::AccountId>,
			sscc: Vec<u8>,
			mut amount: u128,
		) -> DispatchResult {
			// 初始化并校验元数据
			let (owner, time) = Pallet::<T>::get_metadata(origin)?;
			let destination_gln = Pallet::<T>::get_gln(destination_gln)?;
			let bar_code = Pallet::<T>::parse_bar_code(&raw_bar_code)?;
			let carrier_gln = Pallet::<T>::get_gln(carrier_gln)?;
			let origin_gln = Pallet::<T>::get_gln(origin_gln)?;
			let sscc = Pallet::<T>::parse_sscc(&sscc)?;
			Pallet::<T>::verify_amount(&amount, &bar_code)?;
			let ori_identity = (bar_code, owner, origin_gln);
			Pallet::<T>::verify_shelf_life(&ori_identity, &time)?;
			let dest_identity = (bar_code, owner, destination_gln);

			let food_trace =
				TraceEvent::Transport { origin_gln, destination_gln, carrier_gln, sscc, time };

			// 获取最大nonce值
			let mut ori_nonce = Pallet::<T>::get_max_nonce(&ori_identity);
			let mut dest_nonce = Pallet::<T>::get_max_nonce(&dest_identity);

			// 优先运输 nonce 值较大的库存
			// 若所需要的量不够，则继续消耗
			while amount > 0 {
				if ori_nonce == 0 {
					return Err(Error::<T>::InsufficientInventory.into());
				}

				ori_nonce -= 1;

				// 先存入食品痕迹，再将痕迹索引键关联到食品项
				let (item, hash) = FoodItem::<T>::get(&ori_identity, ori_nonce).unwrap();
				let new_hash = Pallet::<T>::get_hash(&(food_trace, hash));
				FoodTrace::<T>::insert(&new_hash, &(food_trace, Some(hash)));

				if item > amount {
					// 该项数量比需要的更多，消耗完还有剩余
					FoodItem::<T>::insert(&ori_identity, ori_nonce, &(item - amount, hash));
					FoodItem::<T>::insert(&dest_identity, dest_nonce, &(amount, new_hash));
					amount = 0;
				} else {
					// 该项数量完全消耗
					FoodItem::<T>::remove(&ori_identity, ori_nonce);
					FoodItem::<T>::insert(&dest_identity, dest_nonce, &(item, new_hash));
					amount -= item;
				}

				dest_nonce += 1;
			}

			Self::deposit_event(Event::FoodTransported(bar_code, food_trace));
			Ok(())
		}

		/// 设置账户关联的 GLN
		#[pallet::call_index(4)]
		#[pallet::weight((Weight::default(), Pays::No))]
		pub fn set_account_gln(
			origin: OriginFor<T>,
			target: T::AccountId,
			gln: Vec<u8>,
		) -> DispatchResult {
			// 确保 root 权限
			let _ = ensure_root(origin).map_err(|_| Error::<T>::NoRootPrivileges)?;

			// 已关联 GLN ，不能重复关联
			if AccountGLN::<T>::contains_key(&target) {
				Err(Error::<T>::GlnAlreadySet)?;
			}

			// 解析并存储 GLN 字符串
			let gln = Pallet::<T>::parse_gln(&gln)?;
			AccountGLN::<T>::insert(&target, &gln);

			Self::deposit_event(Event::<T>::AccountGlnSet(target, gln));
			Ok(())
		}

		/// 设置 GLN 关联的生产许可证
		#[pallet::call_index(5)]
		#[pallet::weight((Weight::default(), Pays::No))]
		pub fn set_manufacturer_license(
			origin: OriginFor<T>,
			gln: Id<T::AccountId>,
			mut license: Option<Vec<u8>>,
		) -> DispatchResult {
			// 确保 root 权限
			let _ = ensure_root(origin).map_err(|_| Error::<T>::NoRootPrivileges)?;

			// 解析 GLN 与许可证
			let gln = Pallet::<T>::get_gln(gln)?;
			let license = match license {
				Some(ref mut x) => Some(Pallet::<T>::parse_license(x)?),
				None => None,
			};

			// 设置许可证，或注销许可证
			ManufacturerLicense::<T>::set(&gln, license.clone());
			license.map_or_else(
				|| Self::deposit_event(Event::<T>::ManufacturerLicenseUnset(gln)),
				|license| Self::deposit_event(Event::<T>::ManufacturerLicenseSet(gln, license)),
			);

			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		// 生成溯源信息
		pub fn get_trace(
			raw_bar_code: Vec<u8>,
			owner: Vec<u8>,
			locate: Vec<u8>,
			nonce: u8,
		) -> Result<String, DispatchError> {
			let bar_code = Pallet::<T>::parse_bar_code(&raw_bar_code)?;
			let locate = Pallet::<T>::parse_gln(&locate)?;
			let owner = Pallet::<T>::parse_gln(&owner)?;

			let mut traces = Vec::new();

			let food_item_hash = FoodItem::<T>::get((bar_code, owner, locate), nonce)
				.ok_or(Error::<T>::InsufficientInventory)?
				.1;
			// let food_item_hash = hash;

			let mut trace = FoodTrace::<T>::get(&food_item_hash).unwrap();
			traces.push(trace.0);

			while trace.1.is_some() {
				trace = FoodTrace::<T>::get(trace.1.as_ref().unwrap()).unwrap();
				traces.push(trace.0);
			}

			let traces = traces.into_iter().map(|te| te.to_string()).collect::<String>();

			// traces.push_str("\n食品原料：");
			// let materials =
			// 	FoodMaterials::<T>::get(bar_code).ok_or(Error::<T>::InsufficientInventory)?;
			// if materials.is_empty() {
			// 	traces.push_str("无");
			// }
			// for i in materials {
			// 	traces.push_str(String::from_utf8_lossy(i.0))
			// }

			Ok(traces)
		}

		// 根据账号或字符串，获取 GLN
		fn get_gln(id: Id<T::AccountId>) -> Result<GLN, DispatchError> {
			let gln = match id {
				Id::GLN(gln) => Pallet::<T>::parse_gln(&gln)?,
				Id::AccId(id) => AccountGLN::<T>::get(id).ok_or(Error::<T>::GlnNotExist)?,
			};
			Ok(gln)
		}

		// 计算哈希
		fn get_hash<E: Encode>(data: &E) -> Hash {
			<Blake2_128 as StorageHasher>::hash(&data.encode())
		}

		// 获取所有者 GLN 与当前时间
		fn get_metadata(origin: OriginFor<T>) -> Result<(GLN, Times), DispatchError> {
			let who = ensure_signed(origin).map_err(|_| Error::<T>::TransactionUnsign)?;
			let owner = AccountGLN::<T>::get(who).ok_or(Error::<T>::GlnNotExist)?;
			let time: Times = {
				let secs = <pallet_timestamp::Pallet<T> as UnixTime>::now().as_secs();
				NaiveDateTime::from_timestamp_opt(secs as i64, 0)
					.ok_or(Error::<T>::GetTimeError)?
					.add(FixedOffset::east_opt(8 * 3600).unwrap()) // 东八区
					.format("%y%m%d%H%M%S")
					.to_string()
					.into_bytes()
					.try_into()
					.map_err(|_| Error::<T>::GetTimeError)?
			};
			Ok((owner, time))
		}

		// 获取当前拥有的，该批食品项的最大 nonce 值
		fn get_max_nonce(identity: &(BarCode, GLN, GLN)) -> u8 {
			let mut nonce = 0u8;
			while FoodItem::<T>::contains_key(identity, nonce) {
				nonce += 1;
			}
			nonce
		}

		// 从字符串解析条形码
		fn parse_bar_code(raw_bar_code: &[u8]) -> Result<BarCode, DispatchError> {
			if raw_bar_code.len() <= 18 {
				Err(Error::<T>::BarCodeTooShort)?;
			}
			if raw_bar_code[0..2] != [b'0', b'1'] {
				Err(Error::<T>::BarCodeUnexpectIdentifier)?;
			}

			let gtin: [u8; 14] =
				raw_bar_code[2..16].try_into().map_err(|_| Error::<T>::ConversionError)?;
			Pallet::<T>::verify_code(&gtin)?;

			let mut temp = raw_bar_code[18..].to_vec();
			temp.resize(20, b'0');
			for x in &temp {
				if !x.is_ascii_alphanumeric() {
					Err(Error::<T>::UseUnexpectCharacter)?;
				}
			}
			let append = temp.try_into().map_err(|_| Error::<T>::ConversionError)?;

			match raw_bar_code[16..=17] {
				[b'1', b'0'] => Ok(BarCode::GtinBatch(gtin, append)),
				[b'2', b'1'] => Ok(BarCode::GtinSerial(gtin, append)),
				_ => Err(Error::<T>::BarCodeUnexpectIdentifier)?,
			}
		}

		// 从字符串解析 SSCC 编码
		fn parse_sscc(mut code: &[u8]) -> Result<SSCC, DispatchError> {
			let len = code.len();
			if len != 20 && len != 18 {
				Err(Error::<T>::SSCCLenError)?;
			}

			if len == 20 && code[0..2] == [b'0', b'0'] {
				code = &code[2..];
			} else {
				Err(Error::<T>::SSCCFormatError)?;
			}

			Pallet::<T>::verify_code(code)?;
			code.try_into().map_err(|_| Error::<T>::ConversionError.into())
		}

		// 从字符串解析 GLN 编码
		fn parse_gln(mut code: &[u8]) -> Result<GLN, DispatchError> {
			let len = code.len();
			if len != 16 && len != 13 {
				Err(Error::<T>::GLNLenError)?;
			}

			match code[2] {
				_ if len == 13 => (),
				48..=54 if code[0..2] == [b'4', b'1'] => code = &code[3..],
				_ => Err(Error::<T>::GLNFormatError)?,
			}

			Pallet::<T>::verify_code(code)?;
			code.try_into().map_err(|_| Error::<T>::ConversionError.into())
		}

		// 从字符串解析生产许可证编码
		fn parse_license(code: &mut [u8]) -> Result<License, DispatchError> {
			let license = match code.len() {
				16 => {
					for x in &mut code[0..2] {
						*x = x.to_ascii_uppercase();
					}
					Pallet::<T>::verify_manufacturer_sc_license(code)?;
					License::SC(code.try_into().map_err(|_| Error::<T>::ConversionError)?)
				},
				18 => {
					if code[0].to_ascii_uppercase() != b'C' {
						Err(Error::<T>::LicenseFormatError)?;
					}
					for x in &mut code[0..4] {
						if !x.is_ascii_alphabetic() {
							Err(Error::<T>::UseUnexpectCharacter)?;
						};
						*x = x.to_ascii_uppercase();
					}
					for x in &code[4..] {
						if !x.is_ascii_digit() {
							Err(Error::<T>::UseUnexpectCharacter)?;
						}
					}
					License::CZZZ(code.try_into().map_err(|_| Error::<T>::ConversionError)?)
				},
				_ => Err(Error::<T>::LicenseLenError)?,
			};

			Ok(license)
		}

		// 校验条形码、GLN编码、SSCC编码
		fn verify_code(code: &[u8]) -> Result<(), DispatchError> {
			let len = code.len();
			let mut is_even = true;
			let mut odd_even = [0i8; 2];
			for i in code[..len - 1].into_iter().rev() {
				let num = (48..58)
					.contains(i)
					.then(|| (*i - 48) as i8)
					.ok_or(Error::<T>::UseUnexpectCharacter)?;
				odd_even[is_even as usize] = (odd_even[is_even as usize] + num) % 10;
				is_even = !is_even;
			}

			let digest = (-odd_even[1] * 3 - odd_even[0]).rem_euclid(10);
			if code[len - 1] != digest.to_string().as_bytes()[0] {
				Err(Error::<T>::CodeVerificationFailed)?;
			}

			Ok(())
		}

		// 校验数量合法性
		fn verify_amount(amount: &u128, bar_code: &BarCode) -> Result<(), DispatchError> {
			match bar_code {
				BarCode::GtinSerial(..) if *amount != 1 => Err(Error::<T>::AmountSingleItemError)?,
				_ if *amount == 0 => Err(Error::<T>::AmountZeroError)?,
				_ => Ok(()),
			}
		}

		// 校验生产许可证编码
		fn verify_manufacturer_sc_license(code: &[u8]) -> Result<(), DispatchError> {
			if code.len() != 16 {
				Err(Error::<T>::LicenseLenError)?;
			}
			if code[0..2] != [b'S', b'C'] {
				Err(Error::<T>::LicenseFormatError)?;
			}
			let mut temp = 10i8;
			for i in &code[2..15] {
				let num = (48..58)
					.contains(i)
					.then(|| (*i - 48) as i8)
					.ok_or(Error::<T>::UseUnexpectCharacter)?;
				temp = ((10 - (-temp - num).rem_euclid(10)) * 2) % 11;
			}
			let digest = (48..58)
				.contains(&code[15])
				.then(|| (code[15] - 48) as i8)
				.ok_or(Error::<T>::UseUnexpectCharacter)?;
			if (temp + digest) % 10 != 1 {
				Err(Error::<T>::LicenseVerificationFailed)?;
			}
			Ok(())
		}

		// 校验保质期
		fn verify_shelf_life(
			identity: &(BarCode, [u8; 13], [u8; 13]),
			time: &[u8; 12],
		) -> Result<(), DispatchError> {
			let hash = Pallet::<T>::get_hash(&identity.0);
			let produce_trace =
				&FoodTrace::<T>::get(&hash).ok_or(Error::<T>::InsufficientInventory)?.0;
			let (shelf_life_days, prod_time) = match produce_trace {
				TraceEvent::Produce { shelf_life_days, time, .. } => (shelf_life_days, time),
				_ => Err(Error::<T>::ShelfLifeVerifyFail)?,
			};
			let from_time = |time: &[u8; 12]| {
				let year = 2000i32 + (time[0] as i32 - 48) * 10 + (time[1] as i32 - 48);
				let month = (time[2] as u32 - 48) * 10 + (time[3] as u32 - 48);
				let day = (time[4] as u32 - 48) * 10 + (time[5] as u32 - 48);
				NaiveDate::from_ymd_opt(year, month, day).ok_or(Error::<T>::ShelfLifeVerifyFail)
			};
			let best_before = from_time(prod_time)? + Days::new(*shelf_life_days as u64);
			let now = from_time(time)?;

			if best_before < now {
				Err(Error::<T>::ShelfLifeVerifyFail)?;
			}

			Ok(())
		}
	}
}
