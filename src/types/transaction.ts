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
  vitality: number;      // 活発さ
  intelligence: number;  // 知性
  creativity: number;    // 表現力
  sociability: number;   // 社会性
}

// 種族
export type Species = 'Baby' | 'Warrior' | 'Scholar' | 'Artist' | 'Diplomat' | 'Explorer';

// トランザクションタイプ
export type TransactionType = 
  | 'transfer'
  | 'execute'
  | 'setData'
  | 'addPermission'
  | 'addController'
  | 'claim'
  | 'contract_deployment'
  | 'other';
