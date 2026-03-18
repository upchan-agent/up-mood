// 生態パラメータ計算ロジック

import type { Transaction, EcoAttributes, Species, TransactionType } from '../types/transaction';

/**
 * トランザクションを分類
 */
export function classifyTransaction(tx: Transaction): TransactionType {
  // コントラクトデプロイ
  if (!tx.to) {
    return 'contract_deployment';
  }
  
  // input が undefined または空の場合は送金として扱う
  if (!tx.input || tx.input === '0x' || tx.input === '') {
    return 'transfer';
  }
  
  // メソッド名で分類（Blockscout API がデコードした値を使用）
  const method = (tx.method || '').toLowerCase();
  
  if (method === 'execute') return 'execute';
  if (method === 'setdata') return 'setData';
  if (method === 'addpermission') return 'addPermission';
  if (method === 'addcontroller') return 'addController';
  if (method === 'claim') return 'claim';
  if (method === 'setdatabatch') return 'setData'; // setDataBatch も creativity にカウント
  
  // メソッド名が取得できない場合は関数セレクターでフォールバック
  const selector = tx.input.slice(0, 10).toLowerCase();
  const FUNCTION_SELECTORS: Record<string, TransactionType> = {
    '0x44c028fe': 'execute',        // execute(uint256,address,uint256,bytes)
    '0x7f23690c': 'setData',        // setData(bytes32,bytes)
    '0x97902421': 'setData',        // setDataBatch(bytes32[],bytes[])
    '0x39522214': 'addPermission',  // addPermission(address,uint256)
    '0x8b0604f8': 'addController',  // addController(address)
    '0x39560415': 'claim',          // claim(bytes32,bytes,bytes)
  };
  
  return FUNCTION_SELECTORS[selector] || 'other';
}

/**
 * 生態パラメータを計算
 */
export function calculateEcoAttributes(txs: Transaction[]): EcoAttributes {
  const attrs: EcoAttributes = {
    vitality: 0,
    intelligence: 0,
    creativity: 0,
    sociability: 0,
  };
  
  for (const tx of txs) {
    const type = classifyTransaction(tx);
    
    switch (type) {
      case 'transfer':
        // 活発さ：送金回数
        attrs.vitality += 1;
        break;
        
      case 'execute':
        // 知性：契約実行
        attrs.intelligence += 2;
        break;
        
      case 'setData':
        // 表現力：メタデータ更新
        attrs.creativity += 1;
        break;
        
      case 'addPermission':
      case 'addController':
        // 社会性：権限付与・コントローラー追加
        attrs.sociability += 2;
        break;
        
      case 'claim':
        // 社会性：LSP12 Claim（他者との相互作用）
        attrs.sociability += 1;
        break;
        
      default:
        // その他は全てに少し貢献
        attrs.vitality += 0.1;
        attrs.intelligence += 0.1;
        attrs.creativity += 0.1;
        attrs.sociability += 0.1;
        break;
    }
  }
  
  // 整数に丸める
  return {
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
  const total = attrs.vitality + attrs.intelligence + attrs.creativity + attrs.sociability;
  
  // 総スコアが低い場合は Baby
  if (total < 5) {
    return 'Baby';
  }
  
  // 最高属性を見つける
  const maxAttr = Object.entries(attrs).reduce((a, b) => 
    b[1] > a[1] ? b : a
  );
  
  const speciesMap: Record<string, Species> = {
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
    Warrior: '活発に送金や取引を行うアクティブな UP。',
    Scholar: '知的な契約実行を得意とする UP。',
    Artist: 'メタデータ更新を好み、自己表現を大切にする UP。',
    Diplomat: '権限付与や他者との協力を重視する UP。',
    Explorer: 'バランスの取れた万能型の UP。',
  };
  
  return descriptions[species];
}
