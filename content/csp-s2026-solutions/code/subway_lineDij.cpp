// subway 部分分：对每条线路预处理一次 Dijkstra（站点 + 线路 的二分图）
// dist[i][v] = “已经在第 i 条线路上”时，走到站点 v 的站厅的最小步行时间
// 询问 (x,y)：ans = w[x] + w[y] + min_{i 经过 x} ( t[i][x] + dist[i][y] )
// 复杂度 O(n (m+Σk) log + q·d)。n=500, m=Σk=5e5 时偏大，能过 1~15、20、21
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
    vector<vector<pair<int, ll> > > at(m);      // 每个站：经过它的 (线路, t)
    vector<vector<int> > onLine(n);             // 每条线：经过的站点
    for (int i = 0; i < n; i++) {
        int k; scanf("%d", &k);
        for (int j = 0; j < k; j++) {
            int a; ll t; scanf("%d %lld", &a, &t); a--;
            at[a].push_back(make_pair(i, t));
            onLine[i].push_back(a);
        }
    }
    // 二分图邻接：站厅 v <-> 线路 i（权 t），线路内部 0 权已缩点
    vector<vector<pair<int, ll> > > adj(m + n);
    for (int v = 0; v < m; v++)
        for (size_t s = 0; s < at[v].size(); s++) {
            int i = at[v][s].first; ll t = at[v][s].second;
            adj[v].push_back(make_pair(m + i, t));
            adj[m + i].push_back(make_pair(v, t));
        }
    vector<vector<ll> > dist(n, vector<ll>(m, 0));   // n*m 可能很大，仅用于小数据档
    vector<ll> best(m + n);
    vector<char> vis(m + n);
    for (int i = 0; i < n; i++) {
        fill(best.begin(), best.end(), INF);
        fill(vis.begin(), vis.end(), 0);
        priority_queue<pair<ll, int>, vector<pair<ll, int> >, greater<pair<ll, int> > > pq;
        best[m + i] = 0; pq.push(make_pair(0LL, m + i));
        while (!pq.empty()) {
            ll du = pq.top().first; int u = pq.top().second; pq.pop();
            if (vis[u]) continue;
            vis[u] = 1;
            for (size_t e = 0; e < adj[u].size(); e++) {
                int v = adj[u][e].first; ll nd = du + adj[u][e].second;
                if (nd < best[v]) { best[v] = nd; pq.push(make_pair(nd, v)); }
            }
        }
        for (int v = 0; v < m; v++) dist[i][v] = best[v];
    }
    while (q--) {
        int x, y; scanf("%d %d", &x, &y); x--; y--;
        ll ans = INF;
        for (size_t s = 0; s < at[x].size(); s++) {
            int i = at[x][s].first; ll t = at[x][s].second;
            if (dist[i][y] == INF) continue;
            ans = min(ans, t + dist[i][y]);
        }
        printf("%lld\n", w[x] + w[y] + ans);
    }
    return 0;
}
