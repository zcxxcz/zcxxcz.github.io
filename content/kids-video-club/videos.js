export const topics = {
  story: "动画故事",
  nature: "自然科学",
  make: "动手创造",
  culture: "人文艺术",
  music: "音乐英语",
};

export const ages = { young: "6–8 岁", older: "9–12 岁", both: "一起看" };

// Lock multipart uploads to the selected CID, and series to an exact episode.
export const videos = [
  {
    title: "太空趣味饮水", age: "young", topic: "nature", color: "lavender", icon: "🧑‍🚀", runtime: "1:38",
    description: "在空间站喝水，水珠会往哪儿跑？",
    source: { bvid: "BV17e411V7wU", aid: 261664964, cid: 865762711 },
  },
  {
    title: "熊猫宝宝学走路", age: "young", topic: "nature", color: "mint", icon: "🐼", runtime: "0:41",
    description: "四条腿好像有四种想法。",
    source: { bvid: "BV1Eb4y1t74D", aid: 634153262, cid: 442917032 },
  },
  {
    title: "小妖怪的夏天", age: "older", topic: "story", color: "peach", icon: "🐗", runtime: "22:43",
    description: "《中国奇谭》第 1 话，一只小猪妖的西游故事。",
    source: { episodeId: 706666, aid: 476982015, cid: 1107179650 },
  },
  {
    title: "两张纸搭一座桥", age: "older", topic: "make", color: "blue", icon: "🌉", runtime: "1:58",
    description: "试试看，你的纸桥能撑住几枚硬币？",
    source: { bvid: "BV1LU4y1L7g9", aid: 673273319, cid: 345006351 },
  },
  {
    title: "贾湖骨笛", age: "young", topic: "culture", color: "sun", icon: "🪈", runtime: "4:55",
    description: "《如果国宝会说话》第一季第 2 集，听听九千年前的笛声。",
    source: { bvid: "BV1VjC8YdEYA", aid: 113729022726140, cid: 27572569231 },
  },
  {
    title: "食虫植物温室", age: "older", topic: "nature", color: "mint", icon: "🪴", runtime: "6:05",
    description: "跟无穷小亮去昆明植物园，看植物怎样捉虫。",
    source: { bvid: "BV1UG4y1Z7nL", aid: 859925448, cid: 885218419 },
  },
  {
    title: "奔跑的奇奇猫", age: "older", topic: "make", color: "sun", icon: "🐱", runtime: "7:59",
    description: "跟着 Scratch 第 2 集，做一个会跑的小猫动画。",
    source: { bvid: "BV1wJ411s7nD", aid: 80727850, cid: 138123148, p: 2 },
  },
  {
    title: "罗小黑战记 · 喵", age: "young", topic: "story", color: "rose", icon: "🐈‍⬛", runtime: "5:04",
    description: "动画第 1 话，小女孩遇见一只神秘黑猫。",
    source: { episodeId: 32374, aid: 1082731, cid: 34441989712 },
  },
  {
    title: "微观小世界", age: "young", topic: "story", color: "mint", icon: "🐞", runtime: "5:33",
    description: "第一季第 1 集，蹲下来看看草丛里的小虫。",
    source: { bvid: "BV1KB4y1U78e", aid: 595682632, cid: 574727570, p: 1 },
  },
  {
    title: "折一架纸飞机", age: "young", topic: "make", color: "blue", icon: "✈️", runtime: "0:15",
    description: "准备一张纸，折好就可以试飞。",
    source: { bvid: "BV1MKmkYdE61", aid: 113459194761673, cid: 26703038980 },
  },
  {
    title: "Walking in the Jungle", age: "young", topic: "music", color: "sun", icon: "🐒", runtime: "3:25",
    description: "跟着英文儿歌在丛林里走一走、停一停。",
    source: { bvid: "BV1hV411h7Gi", aid: 415665224, cid: 267211712, p: 79 },
  },
  {
    title: "动物狂欢节 · 天鹅", age: "young", topic: "music", color: "lavender", icon: "🦢", runtime: "3:09",
    description: "闭上眼睛，听大提琴里的天鹅怎样游过水面。",
    source: { bvid: "BV1Jg411G7Gw", aid: 503504189, cid: 352723663 },
  },
  {
    title: "绘本中的奇妙世界", age: "older", topic: "culture", color: "rose", icon: "📚", runtime: "30:53",
    description: "《但是还有书籍》第 3 集，看画家怎么把故事画进书里。",
    source: { episodeId: 304529, aid: 80585720, cid: 138398539 },
  },
  {
    title: "塔心守千年", age: "older", topic: "culture", color: "peach", icon: "🏯", runtime: "11:22",
    description: "应县木塔的木头零件是怎么一块块咬合的？",
    source: { bvid: "BV1wi421176z", aid: 1453675823, cid: 1519728803 },
  },
  {
    title: "古法造纸 · 三丈三巨宣", age: "older", topic: "make", color: "blue", icon: "📜", runtime: "0:27",
    description: "几十个人一起，从水里捞起一张大纸。",
    source: { bvid: "BV18fQRYkEYd", aid: 114187795701497, cid: 28946925267 },
  },
  {
    title: "小小少年 · 自然之道", age: "older", topic: "nature", color: "mint", icon: "🔍", runtime: "试看",
    description: "第 3 集，跟着爱昆虫的殷然去找虫、观察和做记录。",
    source: { episodeId: 391687, aid: 204845706, cid: 314531240 },
    note: "B 站外链播放器提供试看。",
  },
  {
    title: "大闹天宫", age: "both", topic: "story", color: "peach", icon: "👑", runtime: "暂不可播",
    description: "上美影经典动画，孙悟空闯龙宫、上天庭。",
    note: "这部电影的正片受 B 站地区及会员限制，暂时无法在这里播放。",
  },
];
