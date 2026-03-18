// トランザクション型定義

export interface Transaction {
  hash: string;
  timestamp: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  method?: string;
  block_number: number;
}

export interface InternalTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
}

// 生態パラメータ
export interface EcoAttributes {
  wealth: number;        // 資産移動
  vitality: number;      // 活発さ
  intelligence: number;  // 知性
  creativity: number;    // 表現力
  sociability: number;   // 社会性
}

// 種族
export type Species = 'Baby' | 'Merchant' | 'Warrior' | 'Scholar' | 'Artist' | 'Diplomat' | 'Explorer';

// トランザクションタイプ
export type TransactionType = 
  | 'transfer'
  | 'follow'
  | 'addPermission'
  | 'setData'
  | 'claim'
  | 'execute'
  | 'contract_deployment'
  | 'other';
