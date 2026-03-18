// 生態パラメータ計算ロジック

import type { Transaction, EcoAttributes, Species, TransactionType } from '../types/transaction';

// LSP-26 Follower System 公式コントラクト
const LSP26_FOLLOWER_SYSTEM = '0xf01103e5a9909fc0dbe8166da7085e0285daddca'.toLowerCase();

// LSP-6 KeyManager 関連関数
const LSP6_PERMISSION_FUNCTIONS = new Set([
  '0x39522214', // addPermission(address,uint256)
  '0x8b0604f8', // addController(address)
  '0x6c056015', // removePermission(address,uint256)
  '0x5c06c440', // removeController(address)
]);

// LSP-26 Follower System 関数
const LSP26_FOLLOW_FUNCTIONS = new Set([
  '0x74ee4f68', // follow(address)
  '0x2e5dbf9f', // followBatch(address[])
  '0x6c5a067f', // unfollow(address)
  '0x0f457e0e', // unfollowBatch(address[])
  '0x4dbf27cc', // endorse(address) - LSP-26 拡張
]);

// setData データキー（LSP-3 Profile）
const LSP3_PROFILE_KEY = '0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5';
// LSP-12 Issued Assets
const LSP12_ISSUED_ASSETS_KEY = '0x74ac75e0536d5b911f000f8755b13baf76970800000000000000000000000000';

/**
 * execute 内の関数を解析
 */
function classifyExecuteInput(input: string, _to?: string | null): TransactionType {
  if (!input || input.length < 10) {
    return 'execute';
  }
  
  // execute(uint256,address,uint256,bytes) = 0x44c028fe
  // input 構造：[selector:4][operationType:32][target:32][value:32][dataOffset:32][dataLength:32][data:...]
  if (input.startsWith('0x44c028fe')) {
    // target address を抽出（20-44 文字目：0x を除く 68-92 文字目）
    const targetStart = 68;
    const targetEnd = 132;
    const targetHex = input.slice(targetStart, targetEnd);
    
    try {
      // address 部分を取り出す（右詰めなので下位 40 文字）
      const targetAddress = '0x' + targetHex.slice(-40).toLowerCase();
      
      // LSP-26 Follower System への呼び出し
      if (targetAddress === LSP26_FOLLOWER_SYSTEM) {
        // data 部分（calldata）を解析
        const dataOffset = 196; // dataOffset 位置
        if (input.length > dataOffset + 64) {
          const dataHex = input.slice(dataOffset + 64); // data 本体
          if (dataHex.length >= 8) {
            const innerSelector = '0x' + dataHex.slice(0, 8);
            if (LSP26_FOLLOW_FUNCTIONS.has(innerSelector)) {
              return 'follow';
            }
          }
        }
        return 'follow'; // Follower System への呼び出しは全て Sociability
      }
    } catch (e) {
      console.warn('Failed to parse execute target:', e);
    }
    
    return 'execute';
  }
  
  // 直接呼び出しの関数セレクター
  const selector = input.slice(0, 10).toLowerCase();
  
  // LSP-26 直接呼び出し
  if (LSP26_FOLLOW_FUNCTIONS.has(selector)) {
    return 'follow';
  }
  
  // LSP-6 権限関連
  if (LSP6_PERMISSION_FUNCTIONS.has(selector)) {
    return 'addPermission';
  }
  
  // setData 系
  if (selector === '0x7f23690c' || selector === '0x97902421') {
    return 'setData';
  }
  
  // claim
  if (selector === '0x39560415') {
    return 'claim';
  }
  
  return 'execute';
}

/**
 * setData のデータキーを解析
 */
function classifySetData(input: string): TransactionType {
  if (!input || input.length < 74) {
    return 'setData';
  }
  
  // setData(bytes32 dataKey, bytes dataValue)
  // dataKey は 32 bytes（64 文字）
  const dataKeyStart = 10; // selector 後
  const dataKey = input.slice(dataKeyStart, dataKeyStart + 64).toLowerCase();
  
  // LSP-3 Profile 更新 → Creativity
  if (dataKey.startsWith(LSP3_PROFILE_KEY.slice(0, 10))) {
    return 'setData';
  }
  
  // LSP-12 Issued Assets → Sociability（他者への発行）
  if (dataKey.startsWith(LSP12_ISSUED_ASSETS_KEY.slice(0, 10))) {
    return 'claim';
  }
  
  return 'setData';
}

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
  
  // endorse (LSP-26 拡張)
  if (method === 'endorse' || method === 'endorsebatch') {
    return 'follow';
  }
  
  // 権限・コントローラー関連 (LSP-6 KeyManager)
  if (method === 'addpermission' || method === 'addcontroller' || method === 'removepermission' || method === 'removecontroller') {
    return 'addPermission';
  }
  
  // setData 系 (LSP-2/3/12)
  if (method === 'setdata' || method === 'setdatabatch') {
    return classifySetData(tx.input);
  }
  
  // execute 系
  if (method === 'execute' || method === 'executebatch' || method === 'executerelaycall') {
    return classifyExecuteInput(tx.input, tx.to);
  }
  
  // claim (LSP-12)
  if (method === 'claim') {
    return 'claim';
  }
  
  // setDataBatch
  if (method === 'setdatabatch') {
    return 'setData';
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
  
  // デバッグ用：分類結果をカウント
  const typeCount: Record<string, number> = {};
  
  for (const tx of txs) {
    const type = classifyTransaction(tx);
    typeCount[type] = (typeCount[type] || 0) + 1;
    
    switch (type) {
      case 'transfer':
        // Wealth: 単純送金
        attrs.wealth += 1;
        break;
        
      case 'follow':
        // Sociability: follow/unfollow/endorse (LSP-26)
        attrs.sociability += 3;
        break;
        
      case 'addPermission':
        // Sociability: 権限付与・コントローラー追加 (LSP-6)
        attrs.sociability += 3;
        break;
        
      case 'setData':
        // Creativity: メタデータ更新 (LSP-3)
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
  
  console.log('[Eco] Type breakdown:', typeCount);
  
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
