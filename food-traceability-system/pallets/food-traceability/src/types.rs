use codec::alloc::string::String;
use codec::alloc::string::ToString;
use core::fmt::Display;
use core::write;

use frame_support::dispatch::Vec;
use frame_support::pallet_prelude::*;
pub use frame_support::StorageHasher;

pub type GTIN = [u8; 14];
pub type GLN = [u8; 13];
pub type SSCC = [u8; 18];
pub type Batch = [u8; 20];
pub type Serial = [u8; 20];
pub type Times = [u8; 12];
pub type Hash = <Blake2_128 as StorageHasher>::Output;

/// 参与方标识
#[derive(Clone, Encode, Decode, PartialEq, RuntimeDebug, TypeInfo)]
pub enum Id<AccountId> {
	AccId(AccountId),
	GLN(Vec<u8>),
}

/// 生产许可证
#[derive(Clone, Encode, Decode, PartialEq, Copy, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum License {
	SC([u8; 16]),
	CZZZ([u8; 18]),
}

/// 条形码格式
#[derive(Clone, Encode, Decode, PartialEq, Copy, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum BarCode {
	// 标识一批货物
	GtinBatch(GTIN, Batch),
	// 标识单个货物，数量必须为 1 。
	GtinSerial(GTIN, Serial),
}

/// 计数单位
#[derive(Clone, Encode, Decode, PartialEq, Copy, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum CountUnit {
	Portion,    // 份
	Microgram,  // 微克
	Milliliter, // 毫升
}

/// 原材料
#[derive(Clone, Encode, Decode, PartialEq, Copy, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Material(pub BarCode, pub Hash);

/// 痕迹事件
#[derive(Clone, Encode, Decode, PartialEq, Copy, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum TraceEvent {
	// 496 bit
	Produce {
		manufacturer: GLN,             // 生产商 GLN
		manufacturer_license: License, // 食品生产许可证号
		unit: CountUnit,               // 计数单位
		shelf_life_days: u16,          // 保质期（天）
		time: Times,                   // 年月日时分秒
	},
	// 432 bit
	Trade {
		seller: GLN,
		buyer: GLN,
		time: Times,
	},
	// 472 bit
	Store {
		warehouse: GLN,
		sscc: SSCC, // 系列货运包装箱代码
		time: Times,
	},
	// 680 bit
	Transport {
		origin_gln: GLN,
		destination_gln: GLN,
		carrier_gln: GLN,
		sscc: SSCC,
		time: Times,
	},
}

impl Display for TraceEvent {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		fn parse_time(time: &[u8; 12]) -> String {
			// "20{}{}-{}{}-{}{} {}{}:{}{}:{}{}",
			"20".to_string()
				+ (time[0] - 48).to_string().as_str()
				+ (time[1] - 48).to_string().as_str()
				+ "-" + (time[2] - 48).to_string().as_str()
				+ (time[3] - 48).to_string().as_str()
				+ "-" + (time[4] - 48).to_string().as_str()
				+ (time[5] - 48).to_string().as_str()
				+ " " + (time[6] - 48).to_string().as_str()
				+ (time[7] - 48).to_string().as_str()
				+ ":" + (time[8] - 48).to_string().as_str()
				+ (time[9] - 48).to_string().as_str()
				+ ":" + (time[10] - 48).to_string().as_str()
				+ (time[11] - 48).to_string().as_str()
		}

		let str =
			match self {
				TraceEvent::Produce {
					manufacturer,
					manufacturer_license,
					unit,
					shelf_life_days,
					time,
				} => {
					let manufacturer = &*String::from_utf8_lossy(manufacturer);
					let manufacturer_license = match manufacturer_license {
						License::SC(sc) => String::from_utf8_lossy(sc).to_string(),
						License::CZZZ(czzz) => String::from_utf8_lossy(czzz).to_string(),
					};
					let unit = match unit {
						CountUnit::Portion => "一份",
						CountUnit::Microgram => "微克",
						CountUnit::Milliliter => "毫升",
					};
					let time = parse_time(time);

					"{{生产：".to_string()
						+ "\n\t生产时间：" + time.as_str()
						+ "\n\t生产商GLN编号：" + manufacturer
						+ "\n\t许可证编号：" + manufacturer_license.as_str()
						+ "\n\t计数单位：" + unit
						+ "\n\t保质期：" + shelf_life_days.to_string().as_str()
						+ "天}}\n\n"
				},
				TraceEvent::Trade { seller, buyer, time } => {
					let seller = &*String::from_utf8_lossy(seller);
					let buyer = &*String::from_utf8_lossy(buyer);
					let time = parse_time(time);
					"{{交易：".to_string()
						+ "\n\t交易时间：" + time.as_str()
						+ "\n\t卖出方GLN编号：" + seller
						+ "\n\t买入方GLN编号：" + buyer
						+ "}}\n\n"
				},
				TraceEvent::Store { warehouse, sscc, time } => {
					let warehouse = &*String::from_utf8_lossy(warehouse);
					let sscc = &*String::from_utf8_lossy(sscc);
					let time = parse_time(time);
					"{{存储：".to_string()
						+ "\n\t存储时间：" + time.as_str()
						+ "\n\t仓库GLN编号：" + warehouse
						+ "\n\t装箱码：" + sscc + "}}\n\n"
				},
				TraceEvent::Transport { origin_gln, destination_gln, carrier_gln, sscc, time } => {
					let origin_gln = &*String::from_utf8_lossy(origin_gln);
					let destination_gln = &*String::from_utf8_lossy(destination_gln);
					let carrier_gln = &*String::from_utf8_lossy(carrier_gln);
					let sscc = &*String::from_utf8_lossy(sscc);
					let time = parse_time(time);
					"{{运输：".to_string()
						+ "\n\t运输开始时间：" + time.as_str()
						+ "\n\t起点GLN编号：" + origin_gln
						+ "\n\t终点GLN编号：" + destination_gln
						+ "\n\t承运商GLN编号：" + carrier_gln
						+ "\n\t装箱码：" + sscc + "}}\n\n"
				},
			};
		write!(f, "{str}")
	}
}

// impl Display for Material {
// 	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
// 		write!(f, "食品条码：{}")
// 	}
// }
