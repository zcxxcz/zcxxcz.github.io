// subway 部分分 3：特殊性质 B（所有 t[i][j] 都等于同一个 T）
// 此时走路代价只和“用了多少条线路”有关：用 c 条线，总步行 = w[x]+w[y]+2cT
// 于是问题变成：在“线路图”上求 x 所在的线到 y 所在的线的最少换乘次数（BFS）
// 期望得分：测试点 16~19（8 分）
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int MAXN = 505;
int c, n, m, d, q;
vector<pair<int, ll> > at[500005];   // 每个站经过的 (线路, t)
int main() {
    freopen("subway.in", "r", stdin);
    freopen("subway.out", "w", stdout);
    if (scanf("%d %d %d %d %d", &c, &n, &m, &d, &q) != 5) return 0;
    vector<ll> w(m);
    for (int i = 0; i < m; i++) scanf("%lld", &w[i]);
    ll T = -1;
    for (int i = 0; i < n; i++) {
        int k; scanf("%d", &k);
        for (int j = 0; j < k; j++) {
            int a; ll t; scanf("%d %lld", &a, &t); a--;
            at[a].push_back({i, t});
            T = t;
        }
    }
    // 线路图：两条线在同一个站相交就连边
    vector<vector<int> > g(n);
    for (int v = 0; v < m; v++)
        for (size_t p = 0; p < at[v].size(); p++)
            for (size_t s = p + 1; s < at[v].size(); s++) {
                g[at[v][p].first].push_back(at[v][s].first);
                g[at[v][s].first].push_back(at[v][p].first);
            }
    while (q--) {
        int x, y; scanf("%d %d", &x, &y); x--; y--;
        // 从 x 所在的线路多源 BFS，看最少用几条线覆盖 y
        vector<int> dis(n, -1);
        queue<int> Q;
        for (auto &e : at[x]) if (dis[e.first] == -1) { dis[e.first] = 1; Q.push(e.first); }
        int best = 0;
        while (!Q.empty()) {
            int u = Q.front(); Q.pop();
            bool ok = false;
            for (auto &e : at[y]) if (e.first == u) { ok = true; break; }
            if (ok) { best = dis[u]; break; }
            for (int v : g[u]) if (dis[v] == -1) { dis[v] = dis[u] + 1; Q.push(v); }
        }
        printf("%lld\n", w[x] + w[y] + 2LL * best * T);
    }
    return 0;
}
