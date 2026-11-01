// hub 正解：二分答案 + 逐轮剥叶（R-核心）+ 在核心的“度数为 2 的链”上删一段
// 1) 二分通勤半径 R
// 2) 逐轮剥叶求 lev[v]（第几轮被剥掉）；lev[v] > R 的点构成 R-核心。
//    核心恰好是“一个连通块”时的最小方案（核心本身就能 R-覆盖全树）
// 3) 若 |核心| <= k 直接可行；否则必须用两个连通块 = 在核心的一条度-2 链上删掉连续一段。
//    被删的点 i（链上第 i 个，相邻保留点是第 L 和第 Rgt 个）必须满足
//        min(i-L, Rgt-i) + a_i <= R      （a_i = 它悬挂的已剥落枝条的最大深度）
//    等价于：不存在 i 使 post_i > L 且 h_i < Rgt，其中 post_i = i+a_i-R, h_i = i+R-a_i。
//    于是对每个 L 取 Rgt <= min(m+1, min{h_i : post_i > L})，线性扫一遍取最大可删长度。
// 期望得分：100   复杂度 O(n log n)
#include <bits/stdc++.h>
using namespace std;
const int INF = 1e9;
static int n, k;
static int head[1000005], eto[2000005], enxt[2000005], ecnt;
static int deg[1000005], lev[1000005], que[1000005];
static int cdeg[1000005];
static char inCore[1000005], used[1000005];
static int chainBuf[1000005], minAt[1000005], smin[1000005];

static inline void addEdge(int u, int v) { eto[ecnt] = v; enxt[ecnt] = head[u]; head[u] = ecnt++; }

// 逐轮剥叶：lev[v] = 第几轮被剥掉
static void peel() {
    for (int i = 1; i <= n; i++) { deg[i] = 0; lev[i] = 0; }
    for (int u = 1; u <= n; u++)
        for (int e = head[u]; e != -1; e = enxt[e]) deg[u]++;
    int h = 0, t = 0;
    for (int i = 1; i <= n; i++) if (deg[i] <= 1) { lev[i] = 1; que[t++] = i; }
    while (h < t) {
        int u = que[h++];
        for (int e = head[u]; e != -1; e = enxt[e]) {
            int v = eto[e];
            if (lev[v]) continue;
            if (--deg[v] <= 1) { lev[v] = lev[u] + 1; que[t++] = v; }
        }
    }
}

static bool check(int R) {
    int C = 0;
    for (int i = 1; i <= n; i++) { inCore[i] = (lev[i] > R); C += inCore[i]; }
    if (C <= k) return true;               // 一个连通块就够（含核心为空、k>=2）
    for (int i = 1; i <= n; i++) cdeg[i] = 0;
    for (int u = 1; u <= n; u++) if (inCore[u])
        for (int e = head[u]; e != -1; e = enxt[e]) if (inCore[eto[e]]) cdeg[u]++;
    for (int i = 1; i <= n; i++) used[i] = 0;
    int bestDel = 0;
    for (int s = 1; s <= n; s++) {
        if (!inCore[s] || cdeg[s] == 2) continue;
        for (int e = head[s]; e != -1; e = enxt[e]) {
            int v = eto[e];
            if (!inCore[v] || cdeg[v] != 2 || used[v]) continue;
            // 拉出一条度-2 链，第 0 个位置是 s，第 1..m 是链上点
            int m = 0, cur = v, prev = s;
            while (true) {
                chainBuf[++m] = cur; used[cur] = 1;
                int nx = -1;
                for (int f = head[cur]; f != -1; f = enxt[f]) {
                    int w = eto[f];
                    if (w != prev && inCore[w] && cdeg[w] == 2) { nx = w; break; }
                }
                if (nx == -1) break;
                prev = cur; cur = nx;
            }
            for (int i = 0; i <= m + 2; i++) minAt[i] = INF;
            for (int i = 1; i <= m; i++) {
                int u = chainBuf[i], a = 0;
                for (int f = head[u]; f != -1; f = enxt[f]) {
                    int w = eto[f];
                    if (!inCore[w] && lev[w] > a) a = lev[w];
                }
                int post = i + a - R; if (post < 0) post = 0; if (post > m) post = m;
                int hv = i + R - a;           // h_i，超过 m+1 就没意义
                if (hv > minAt[post]) continue;
                minAt[post] = hv;
            }
            smin[m + 2] = INF;
            for (int i = m + 1; i >= 0; i--) smin[i] = min(minAt[i], smin[i + 1]);
            for (int L = 0; L <= m - 1; L++) {
                int maxRgt = min(m + 1, smin[L + 1]);   // 右端最多到 m+1
                if (maxRgt > L + 1) bestDel = max(bestDel, maxRgt - L - 1);
            }
        }
    }
    return C - bestDel <= k;
}

int main() {
    freopen("hub.in", "r", stdin);
    freopen("hub.out", "w", stdout);
    int c, t;
    if (scanf("%d %d", &c, &t) != 2) return 0;
    while (t--) {
        scanf("%d %d", &n, &k);
        ecnt = 0;
        for (int i = 1; i <= n; i++) head[i] = -1;
        for (int i = 1; i < n; i++) {
            int u, v; scanf("%d %d", &u, &v);
            addEdge(u, v); addEdge(v, u);
        }
        peel();
        int mx = 0;
        for (int i = 1; i <= n; i++) mx = max(mx, lev[i]);
        int lo = 0, hi = mx, ans = mx;
        while (lo <= hi) {
            int mid = (lo + hi) >> 1;
            if (check(mid)) { ans = mid; hi = mid - 1; }
            else lo = mid + 1;
        }
        printf("%d\n", ans);
    }
    return 0;
}
