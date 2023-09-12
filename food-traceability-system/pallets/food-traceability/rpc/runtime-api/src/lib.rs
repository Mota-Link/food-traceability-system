#![cfg_attr(not(feature = "std"), no_std)]

use codec::alloc::string::String;

sp_api::decl_runtime_apis! {
	pub trait FoodTraceabilityApi {
		fn get_trace( raw_bar_code: String, owner: String, locate: String, nonce: u8) -> String;
	}
}
