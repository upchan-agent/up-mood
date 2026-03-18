// 生態パラメータ計算ロジック

import type { Transaction, EcoAttributes, Species, TransactionType } from '../types/transaction';

/**
 * トランザクションを分類
 */
export function classifyTransaction(tx: Transaction): TransactionType {
  // input が undefined または空の場合は送金として扱う
  if (!tx.input || tx.input === '0x' || tx.input === '') {
    return 'transfer';
  }
  
  // メソッド名で分類（Blockscout API がデコードした値を使用）
  const method = (tx.method || '').toLowerCase();
  
  // follow/unfollow (LSP-26 Follower System)
  if (method === 'follow' || method === 'followbatch' || method === 'unfollow' || method === 'unfollowbatch') {
    return 'follow';
  }
  
  // 権限・コントローラー関連 (LSP-6 KeyManager)
  if (method === 'addpermission' || method === 'addcontroller' || method === 'removepermission' || method === 'removecontroller') {
    return 'addPermission';
  }
  
  // setData 系 (LSP-2/3/12)
  if (method === 'setdata' || method === 'setdatabatch') {
    return 'setData';
  }
  
  // execute 系
  if (method === 'execute' || method === 'executebatch' || method === 'executerelaycall') {
    // execute 内部の関数を解析
    return classifyExecute(tx.input);
  }
  
  // claim (LSP-12)
  if (method === 'claim') {
    return 'claim';
  }
  
  // デフォルトはその他（Vitality としてカウント）
  return 'execute';
}

/**
 * execute 内の関数を解析して分類
 */
function classifyExecute(input: string): TransactionType {
  if (!input || input.length < 10) {
    return 'execute';
  }
  
  const selector = input.slice(0, 10).toLowerCase();
  
  // follow/unfollow への execute 呼び出し
  if (selector === '0x74ee4f68' || // follow(address)
      selector === '0x2e5dbf9f' || // followBatch(address[])
      selector === '0x6c5a067f' || // unfollow(address)
      selector === '0x0f457e0e') { // unfollowBatch(address[])
    return 'follow';
  }
  
  // 権限関連
  if (selector === '0x39522214' || // addPermission(address,uint256)
      selector === '0x8b0604f8' || // addController(address)
      selector === '0x6c056015' || // removePermission(address,uint256)
      selector === '0x5c06c440') { // removeController(address)
    return 'addPermission';
  }
  
  // setData 系
  if (selector === '0x7f23690c' || // setData(bytes32,bytes)
      selector === '0x97902421') { // setDataBatch(bytes32[],bytes[])
    return 'setData';
  }
  
  // claim
  if (selector === '0x39560415') {
    return 'claim';
  }
  
  // デフォルトは execute（Vitality）
  return 'execute';
}

/**
 * 生態パラメータを計算
 */
export function calculateEcoAttributes(txs: Transaction[]): EcoAttributes {
  const attrs: EcoAttributes = {
    wealth: 0,
    vitality: 0,
    intelligence: 0,
    creativity: 0,
    sociability: 0,
  };
  
  for (const tx of txs) {
    const type = classifyTransaction(tx);
    
    switch (type) {
      case 'transfer':
        // Wealth: 単純送金
        attrs.wealth += 1;
        break;
        
      case 'follow':
        // Sociability: follow/unfollow
        attrs.sociability += 3;
        break;
        
      case 'addPermission':
        // Sociability: 権限付与・コントローラー追加
        attrs.sociability += 3;
        break;
        
      case 'setData':
        // Creativity: メタデータ更新
        attrs.creativity += 3;
        break;
        
      case 'claim':
        // Creativity: LSP12 Claim（自己主張）
        attrs.creativity += 2;
        break;
        
      case 'execute':
        // Vitality: 一般的な execute 操作
        attrs.vitality += 1;
        break;
        
      default:
        // Intelligence: 複雑な契約実行
        attrs.intelligence += 2;
        break;
    }
  }
  
  // 整数に丸める
  return {
    wealth: Math.floor(attrs.wealth),
    vitality: Math.floor(attrs.vitality),
    intelligence: Math.floor(attrs.intelligence),
    creativity: Math.floor(attrs.creativity),
    sociability: Math.floor(attrs.sociability),
  };
}

/**
 * 種族を決定
 */
export function getSpecies(attrs: EcoAttributes): Species {
  const total = attrs.wealth + attrs.vitality + attrs.intelligence + attrs.creativity + attrs.sociability;
  
  // 総スコアが低い場合は Baby
  if (total < 5) {
    return 'Baby';
  }
  
  // 最高属性を見つける
  const maxAttr = Object.entries(attrs).reduce((a, b) => 
    b[1] > a[1] ? b : a
  );
  
  const speciesMap: Record<string, Species> = {
    wealth: 'Merchant',
    vitality: 'Warrior',
    intelligence: 'Scholar',
    creativity: 'Artist',
    sociability: 'Diplomat',
  };
  
  return speciesMap[maxAttr[0]] || 'Explorer';
}

/**
 * 属性を正規化（0-100%）
 */
export function normalizeAttribute(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

/**
 * 種族の説明を取得
 */
export function getSpeciesDescription(species: Species): string {
  const descriptions: Record<Species, string> = {
    Baby: 'まだ生まれたばかりの UP。これから成長していきます。',
    Merchant: '資産移動を得意とする商才あふれる UP。',
    Warrior: '活発に活動するアクティブな UP。',
    Scholar: '知的な契約実行を得意とする UP。',
    Artist: 'メタデータ更新を好み、自己表現を大切にする UP。',
    Diplomat: '他者との関係構築を重視する UP。',
    Explorer: 'バランスの取れた万能型の UP。',
  };
  
  return descriptions[species];
}
