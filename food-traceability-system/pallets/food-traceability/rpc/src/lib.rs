use jsonrpsee::{
	core::{Error as JsonRpseeError, RpcResult},
	proc_macros::rpc,
	types::error::{CallError, ErrorObject},
};
pub use pallet_food_traceability_rpc_runtime_api::FoodTraceabilityApi as FoodTraceabilityRuntimeApi;
use sp_api::ProvideRuntimeApi;
use sp_blockchain::HeaderBackend;
use sp_runtime::traits::Block as BlockT;
use std::sync::Arc;

#[rpc(client, server)]
pub trait FoodTraceabilityApi<BlockHash> {
	#[method(name = "foodTraceability_getTrace")]
	fn get_trace(
		&self,
		at: Option<BlockHash>,
		raw_bar_code: String,
		owner: String,
		locate: String,
		nonce: u8,
	) -> RpcResult<String>;
}

/// A struct that implements the `FoodTraceabilityApi`.
pub struct FoodTraceabilityPallet<C, Block> {
	// If you have more generics, no need to TemplatePallet<C, M, N, P, ...>
	// just use a tuple like TemplatePallet<C, (M, N, P, ...)>
	client: Arc<C>,
	_marker: std::marker::PhantomData<Block>,
}

impl<C, Block> FoodTraceabilityPallet<C, Block> {
	/// Create new `TemplatePallet` instance with the given reference to the client.
	pub fn new(client: Arc<C>) -> Self {
		Self { client, _marker: Default::default() }
	}
}

impl<C, Block> FoodTraceabilityApiServer<<Block as BlockT>::Hash>
	for FoodTraceabilityPallet<C, Block>
where
	Block: BlockT,
	C: Send + Sync + 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: FoodTraceabilityRuntimeApi<Block>,
{
	fn get_trace(
		&self,
		at: Option<<Block as BlockT>::Hash>,
		raw_bar_code: String,
		owner: String,
		locate: String,
		nonce: u8,
	) -> RpcResult<String> {
		let api = self.client.runtime_api();
		let at = at.unwrap_or_else(|| self.client.info().best_hash);

		// let raw_bar_code: Vec<u8> = raw_bar_code.0;
		// let owner: Vec<u8> = owner.0;
		// let locate: Vec<u8> = locate.0;

		api.get_trace(at, raw_bar_code, owner, locate, nonce)
			// .map(|x| x.into())
			.map_err(runtime_error_into_rpc_err)
	}
}

const RUNTIME_ERROR: i32 = 1;

/// Converts a runtime trap into an RPC error.
fn runtime_error_into_rpc_err(err: impl std::fmt::Debug) -> JsonRpseeError {
	CallError::Custom(ErrorObject::owned(
		RUNTIME_ERROR,
		"Runtime error",
		Some(format!("{:?}", err)),
	))
	.into()
}
