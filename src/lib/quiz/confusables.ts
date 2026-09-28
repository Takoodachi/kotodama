/**
 * Characters learners mix up, either because they look alike or because they
 * belong to the same family (numbers, directions, seasons). Picking
 * distractors from the same cluster makes multiple choice test real
 * recognition, not elimination.
 */
const CLUSTERS: string[] = [
  // Hiragana look-alikes
  "あおめぬ", "ぬめのね", "ねれわ", "はほけ", "けはに", "さきちら", "ちらろ", "るろそ",
  "いりこ", "こにた", "たなに", "しつくへ", "すむお", "まもほよ", "うらつ", "てと",
  "ゆよ", "かや", "みめ", "をお", "んそ", "じぢ", "ずづ",
  // Katakana look-alikes
  "シツソン", "ソンリノ", "クケタワ", "ウワフク", "アマヤ", "コユロエ", "ヨユエ",
  "チテ", "ナメヌス", "ヌスフ", "ホオネ", "キモチ", "ハル", "ルレ", "ラテヲフ",
  "ミシ", "トイ", "セサヤ", "ヘベペ", "ジヂ", "ズヅ",
  // Kanji look-alikes
  "日目白百旧", "人入八", "大天太犬", "木本休体", "右左石", "千午牛", "見貝買",
  "間聞門問", "言語話読", "飲食", "東車", "土上士", "今会", "持待時特",
  "未末", "夫天", "力刀", "母毎", "田由", "小少", "夕多", "化花",
  // Kanji families
  "一二三四五六七八九十百千万", "月火水木金土日", "東西南北", "上下中",
  "右左", "春夏秋冬", "朝昼夜", "父母兄弟姉妹子", "男女子", "山川空雨天",
  "見聞読書話言", "行来出入", "高安長新古多少", "口目耳手足",
];

const clusterIndex = new Map<string, Set<number>>();
CLUSTERS.forEach((cluster, index) => {
  for (const ch of cluster) {
    const set = clusterIndex.get(ch) ?? new Set<number>();
    set.add(index);
    clusterIndex.set(ch, set);
  }
});

function base(ch: string): string {
  return ch.normalize("NFD")[0];
}

export function areConfusable(a: string, b: string): boolean {
  if (a === b) return false;
  const [a0, b0] = [[...a], [...b]];
  // Single characters: shared cluster, or same base kana (か / が, は / ば / ぱ)
  if (a0.length === 1 && b0.length === 1) {
    const ca = clusterIndex.get(a);
    const cb = clusterIndex.get(b);
    if (ca && cb && [...ca].some((i) => cb.has(i))) return true;
    return base(a) === base(b);
  }
  // Combination kana: same leading kana or same small ゃゅょ
  if (a0.length === 2 && b0.length === 2) {
    return base(a0[0]) === base(b0[0]) || a0[1] === b0[1];
  }
  return false;
}
