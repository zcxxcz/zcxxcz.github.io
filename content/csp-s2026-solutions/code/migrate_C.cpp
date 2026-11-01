// migrate 部分分 5：逐起点推进，但每层只记“最右两点的最短路条数”（三状态）
// 状态：cp = cnt(p)（>=3 就丢），s = (cnt(p-1) == 1 且 p-1 在上一层内)
// 下一层 (p, t]（t = R[p]）中：
//   one = #只能看见 p 的点  -> 条数 = cnt(p)    （状态 cp=2 时这些点各贡献 1）
//   two = #恰能看见 p-1,p 的点 -> 条数 = cnt(p-1)+cnt(p)（A 状态时各贡献 1）
// 每起点 O(层数)，总 O(n * 层数)。性质 C 下 x_n-x_1 <= 10d，层数是 O(1)，可直接满分档。
// 期望得分：测试点 15~18（72 分）；性质 A/B 上也都正确
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int MAXN = 2000005;
int n; ll d;
ll x[MAXN];
int R[MAXN];
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
    int sg = 1;
    if (c == '-') { sg = -1; c = gc(); }
    v = 0;
    while (c >= '0' && c <= '9') { v = v * 10 + (c - '0'); c = gc(); }
    v *= sg;
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
        int j = 1;
        for (int i = 1; i <= n; i++) {
            if (j < i) j = i;
            while (j + 1 <= n && x[j + 1] - x[i] <= d) j++;
            R[i] = j;
        }
        R[0] = 0;
        ll ans = 0;
        for (int u = 1; u <= n; u++) {
            if (R[u] == u) continue;
            int p = R[u];
            int cp = 1;                       // 第 1 层内 cnt 全为 1
            int s = (p - 1 > u) ? 1 : 0;
            while (R[p] > p) {
                if (cp >= 3) break;           // 之后只会更多，永远不再贡献
                int t = R[p];
                int one = t - max(p, R[p - 1]);
                int two = max(0, R[p - 1] - max(p, R[p - 2]));
                if (cp == 2) ans += one;
                else if (s) ans += two;
                if (one >= 2) s = (cp == 1);
                else if (one == 1) s = 0;
                else if (two > 0 && cp == 1 && s) { cp = 2; s = 0; }
                else break;
                p = t;
            }
        }
        printf("%lld\n", ans);
    }
    return 0;
}
