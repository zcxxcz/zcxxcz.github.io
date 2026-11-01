// subway 正解：把 m 个站厅都“压掉”，只留 n 条线路做 Floyd，询问时两侧各乘一下
// 1) 线路内部乘车 0 步行 -> 一条线就是一个点
// 2) 线路 i 与线路 j 在站 v 换乘的代价 = t[i][v] + t[j][v]，对公共站取 min 得到边权
// 3) 询问 (x,y)：min_{i∋x, j∋y} t[i][x] + D[i][j] + t[j][y]，再加 w[x]+w[y]
// 复杂度 O(n^3 + Σdeg^2 + q·d^2)，n<=500、Σdeg^2<=5e5*20、q·d^2<=4e7
// 期望得分：100
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll INF = (ll)4e18;
int c, n, m, d, q;
int main() {
    freopen("subway.in", "r", stdin);
    freopen("subway.out", "w", stdout);
    if (scanf("%d %d %d %d %d", &c, &n, &m, &d, &q) != 5) return 0;
    vector<ll> w(m);
    for (int i = 0; i < m; i++) scanf("%lld", &w[i]);
    vector<vector<pair<int, ll> > > at(m);   // 每个站：经过它的 (线路, 站台耗时)
    for (int i = 0; i < n; i++) {
        int k; scanf("%d", &k);
        for (int j = 0; j < k; j++) {
            int a; ll t;
            scanf("%d %lld", &a, &t); a--;
            at[a].push_back({i, t});
        }
    }
    vector<vector<ll> > D(n, vector<ll>(n, INF));
    for (int i = 0; i < n; i++) D[i][i] = 0;
    for (int v = 0; v < m; v++) {            // 同一站上的线路两两建边
        auto &L = at[v];
        for (size_t p = 0; p < L.size(); p++)
            for (size_t s = p + 1; s < L.size(); s++) {
                int i = L[p].first, j = L[s].first;
                ll cst = L[p].second + L[s].second;
                if (cst < D[i][j]) D[i][j] = cst;
                if (cst < D[j][i]) D[j][i] = cst;
            }
    }
    for (int k = 0; k < n; k++)              // Floyd
        for (int i = 0; i < n; i++) {
            if (D[i][k] == INF) continue;
            ll dik = D[i][k];
            for (int j = 0; j < n; j++)
                if (D[k][j] != INF && dik + D[k][j] < D[i][j]) D[i][j] = dik + D[k][j];
        }
    while (q--) {
        int x, y; scanf("%d %d", &x, &y); x--; y--;
        ll best = INF;
        for (auto &a : at[x])
            for (auto &b : at[y]) {
                if (D[a.first][b.first] == INF) continue;
                ll cur = a.second + D[a.first][b.first] + b.second;
                if (cur < best) best = cur;
            }
        printf("%lld\n", w[x] + w[y] + best);
    }
    return 0;
}
