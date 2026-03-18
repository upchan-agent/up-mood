// 生態パラメータ計算ロジック

import type { Transaction, EcoAttributes, Species, TransactionType } from '../types/transaction';

// LSP-26 Follower System 公式コントラクト
const LSP26_FOLLOWER_SYSTEM = '0xf01103e5a9909fc0dbe8166da7085e0285daddca'.toLowerCase();

// LSP-26 Follower System 関数
const LSP26_FOLLOW_METHODS = new Set([
  'follow(address)',
  'followbatch(address[])',
  'unfollow(address)',
  'unfollowbatch(address[])',
  'endorse(address)',
  'endorsebatch(address[])',
]);

// LSP-6 KeyManager 関数
const LSP6_PERMISSION_METHODS = new Set([
  'addpermission(address,uint256)',
  'addcontroller(address)',
  'removepermission(address,uint256)',
  'removecontroller(address)',
]);

// LSP-3 Profile データキー
const LSP3_PROFILE_KEY = '0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5';

/**
 * トランザクションを分類
 */
export function classifyTransaction(tx: Transaction): TransactionType {
  // input が undefined または空の場合は送金として扱う
  if (!tx.input || tx.input === '0x' || tx.input === '') {
    return 'transfer';
  }
  
  // decoded_input がある場合はそれを使う
  const decodedInput = (tx as any).decoded_input;
  
  if (decodedInput && decodedInput.method_call) {
    const methodCall = decodedInput.method_call.toLowerCase();
    const methodName = methodCall.split('(')[0];
    
    // follow/unfollow/endorse (LSP-26)
    if (LSP26_FOLLOW_METHODS.has(methodCall) || 
        methodName === 'follow' || methodName === 'unfollow' || methodName === 'endorse') {
      return 'follow';
    }
    
    // 権限・コントローラー関連 (LSP-6)
    if (LSP6_PERMISSION_METHODS.has(methodCall) ||
        methodName === 'addpermission' || methodName === 'addcontroller' ||
        methodName === 'removepermission' || methodName === 'removecontroller') {
      return 'addPermission';
    }
    
    // setData 系
    if (methodName === 'setdata' || methodName === 'setdatabatch') {
      // parameters から dataKey をチェック
      if (decodedInput.parameters && decodedInput.parameters.length > 0) {
        const dataKeyValue = decodedInput.parameters[0]?.value || '';
        const dataKey = dataKeyValue.toLowerCase();
        
        // LSP-3 Profile 更新 → Creativity
        if (dataKey.startsWith(LSP3_PROFILE_KEY.slice(0, 10))) {
          return 'setData';
        }
      }
      return 'setData';
    }
    
    // execute
    if (methodName === 'execute' || methodName === 'executebatch' || methodName === 'executerelaycall') {
      // execute 内の target address をチェック
      if (decodedInput.parameters) {
        const targetParam = decodedInput.parameters.find((p: any) => p.name === 'target' || p.type === 'address');
        if (targetParam && targetParam.value) {
          const targetAddress = targetParam.value.toLowerCase();
          
          // LSP-26 Follower System への呼び出し
          if (targetAddress === LSP26_FOLLOWER_SYSTEM) {
            return 'follow';
          }
        }
      }
      return 'execute';
    }
    
    // claim (LSP-12)
    if (methodName === 'claim') {
      return 'claim';
    }
  }
  
  // decoded_input がない場合は method フィールドを使う
  const method = (tx.method || '').toLowerCase();
  
  if (method === 'follow' || method === 'followbatch' || method === 'unfollow' || 
      method === 'unfollowbatch' || method === 'endorse' || method === 'endorsebatch') {
    return 'follow';
  }
  
  if (method === 'addpermission' || method === 'addcontroller' || 
      method === 'removepermission' || method === 'removecontroller') {
    return 'addPermission';
  }
  
  if (method === 'setdata' || method === 'setdatabatch') {
    return 'setData';
  }
  
  if (method === 'execute' || method === 'executebatch' || method === 'executerelaycall') {
    return 'execute';
  }
  
  if (method === 'claim') {
    return 'claim';
  }
  
  return 'execute';
}

/**
 * 生態パラメータを計算（フラットな重み付け）
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
    
    // フラットな重み付け（すべて +1）
    switch (type) {
      case 'transfer':
        // Wealth: 単純送金
        attrs.wealth += 1;
        break;
        
      case 'follow':
        // Sociability: follow/unfollow/endorse (LSP-26)
        attrs.sociability += 1;
        break;
        
      case 'addPermission':
        // Sociability: 権限付与・コントローラー追加 (LSP-6)
        attrs.sociability += 1;
        break;
        
      case 'setData':
        // Creativity: メタデータ更新 (LSP-3)
        attrs.creativity += 1;
        break;
        
      case 'claim':
        // Creativity: LSP12 Claim（自己主張）
        attrs.creativity += 1;
        break;
        
      case 'execute':
        // Vitality: 一般的な execute 操作
        attrs.vitality += 1;
        break;
        
      default:
        // Intelligence: 複雑な契約実行
        attrs.intelligence += 1;
        break;
    }
  }
  
  console.log('[Eco] Type breakdown:', typeCount);
  
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
  
  if (total < 5) {
    return 'Baby';
  }
  
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
