// LUKSO Blockscout API クライアント

const BLOCKSCOUT_BASE = 'https://explorer.execution.mainnet.lukso.network/api/v2';

export interface BlockscoutTransaction {
  hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string } | null;
  value: string;
  raw_input: string;
  method?: string;
  block_number: number;
  decoded_input?: {
    method_call: string;
    method_id: string;
    parameters: Array<{
      name: string;
      type: string;
      value: string;
    }>;
  };
}

export interface BlockscoutResponse<T> {
  items: T[];
  next_page_params?: any;
}

/**
 * アドレスのトランザクション一覧を取得
 */
export async function getTransactions(address: string): Promise<BlockscoutTransaction[]> {
  const url = `${BLOCKSCOUT_BASE}/addresses/${address}/transactions`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions: ${res.status}`);
  }
  
  const data: BlockscoutResponse<BlockscoutTransaction> = await res.json();
  return data.items || [];
}

/**
 * 内部トランザクションを取得（他 UP との相互作用）
 */
export async function getInternalTransactions(address: string): Promise<any[]> {
  const url = `${BLOCKSCOUT_BASE}/addresses/${address}/internal-transactions`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch internal transactions: ${res.status}`);
  }
  
  const data: BlockscoutResponse<any> = await res.json();
  return data.items || [];
}

/**
 * トランザクションの詳細を取得
 */
export async function getTransactionDetail(hash: string): Promise<any> {
  const url = `${BLOCKSCOUT_BASE}/transactions/${hash}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch transaction: ${res.status}`);
  }
  
  return res.json();
}
