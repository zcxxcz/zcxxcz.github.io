// migrate 正解：把“每个起点的逐层 BFS”合并成一次线性扫描（三状态 DP）
// 记 R[i] = i 一步能飞到的最右岛（双指针 O(n)）。
// 固定起点 u：第 t 层的右端 P_t 满足 P_0=u, P_t=R[P_{t-1}]，第 t 层 = (P_{t-1}, P_t]，
// 层内每个 v 的最短路条数 cnt(v) = 上一层中 [f(v), P_{t-1}] 的 cnt 之和（f(v)=最左能到 v 的岛）。
// 关键：cnt 在同一层内随 v 增大而单调不增，所以“下一层的 cnt”只由当前层最右两点决定：
//   one = #下一层中 f(v)=p 的 v（前驱只有 p）      -> cnt = cnt(p)
//   two = #下一层中 f(v)=p-1 的 v（前驱为 p-1,p）  -> cnt = cnt(p-1)+cnt(p)
// 于是把状态压成三种：
//   A: cnt(p)=1 且 cnt(p-1)=1   B: cnt(p)=1（但 cnt(p-1)≥2 或 p-1 不在本层）   C: cnt(p)=2
// cnt(p)≥3 之后只会越来越大，直接丢弃。
// 所有起点按“当前层右端 p”聚合成 A[p],B[p],C[p]，从小到大扫 p 转移（P_t 严格递增）。
// 期望得分：100
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int MAXN = 2000005;
int n; ll d;
ll x[MAXN];
int R[MAXN];
ll A[MAXN], B[MAXN], C[MAXN];

static char buf[1 << 16];
int bp = 0, blen = 0;
inline char gc() {
    if (bp == blen) { blen = (int)fread(buf, 1, sizeof(buf), stdin); bp = 0; if (blen <= 0) return 0; }
    return buf[bp++];
}
template <class T> inline bool rd(T &v) {
    char c = gc();
    while (c && (c < '0' || c > '9') && c != '-') c = gc();
    if (!c) return false;
    int s = 1;
    if (c == '-') { s = -1; c = gc(); }
    v = 0;
    while (c >= '0' && c <= '9') { v = v * 10 + (c - '0'); c = gc(); }
    v *= s;
    return true;
}

int main() {
    freopen("migrate.in", "r", stdin);
    freopen("migrate.out", "w", stdout);
    int c, t;
    rd(c); rd(t);
    while (t--) {
        rd(n); rd(d);
        for (int i = 1; i <= n; i++) rd(x[i]);
        // 双指针求 R[i]
        int j = 1;
        for (int i = 1; i <= n; i++) {
            if (j < i) j = i;
            while (j + 1 <= n && x[j + 1] - x[i] <= d) j++;
            R[i] = j;
        }
        R[0] = 0;
        for (int i = 0; i <= n + 1; i++) A[i] = B[i] = C[i] = 0;
        // 初始化：起点 u 的第一层是 (u, R[u]]，层内全为 1
        for (int u = 1; u <= n; u++) {
            if (R[u] == u) continue;
            if (R[u] - u >= 2) A[R[u]]++;   // 层内至少两点，最右两点 cnt 都为 1
            else B[R[u]]++;                 // 层内只有一点，最右第二点不在本层
        }
        ll ans = 0;
        for (int p = 2; p <= n; p++) {
            if (!A[p] && !B[p] && !C[p]) continue;
            int nx = R[p];
            if (nx == p) continue;                   // 没有下一层，这些起点到头了
            int one = nx - max(p, R[p - 1]);         // 下一层中只能看见 p 的点数
            int two = max(0, R[p - 1] - max(p, R[p - 2])); // 恰能看见 p-1,p 的点数
            ans += A[p] * two + C[p] * one;          // 恰好两条最短路的终点
            if (one >= 2) {                          // 新层最右两点都只看见 p
                A[nx] += A[p] + B[p];                // cnt=1 -> 状态 A
                C[nx] += C[p];                       // cnt=2 -> 状态 C
            } else if (one == 1) {                   // 最右只看见 p，次右看见 p-1 及以前
                B[nx] += A[p] + B[p];
                C[nx] += C[p];
            } else if (two > 0) {                    // 最右看见 p-1 -> cnt = 1+1 = 2
                C[nx] += A[p];                       // 只有状态 A 能延续
            }
        }
        printf("%lld\n", ans);
    }
    return 0;
}
