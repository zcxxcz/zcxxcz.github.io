// subway 部分分 1：每次询问单独跑 Dijkstra（站厅 m 个点 + 每条线路 1 个点）
// 线路内部乘车不花步行时间 -> 同一条线的所有站台可以缩成一个点，“站厅↔线路”的边权就是 t
// 期望得分：测试点 1~6、9~11、12~15（共 14 个点，约 66 分）。q 很大时超时。
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll INF = (ll)4e18;
int c, n, m, d, q;
vector<ll> w;                       // 站厅耗时
vector<vector<pair<int, ll> > > adj; // hall(0..m-1), line(m..m+n-1)
int main() {
    freopen("subway.in", "r", stdin);
    freopen("subway.out", "w", stdout);
    if (scanf("%d %d %d %d %d", &c, &n, &m, &d, &q) != 5) return 0;
    w.assign(m, 0);
    for (int i = 0; i < m; i++) scanf("%lld", &w[i]);
    adj.assign(m + n, {});
    for (int i = 0; i < n; i++) {
        int k; scanf("%d", &k);
        int lid = m + i;
        for (int j = 0; j < k; j++) {
            int a; ll t;
            scanf("%d %lld", &a, &t); a--;
            adj[a].push_back({lid, t});
            adj[lid].push_back({a, t});
        }
    }
    vector<ll> dist(m + n);
    vector<char> vis(m + n);
    while (q--) {
        int x, y; scanf("%d %d", &x, &y); x--; y--;
        fill(dist.begin(), dist.end(), INF);
        fill(vis.begin(), vis.end(), 0);
        priority_queue<pair<ll, int>, vector<pair<ll, int> >, greater<pair<ll, int> > > pq;
        dist[x] = 0; pq.push({0, x});
        while (!pq.empty()) {
            ll du = pq.top().first;
            int u = pq.top().second;
            pq.pop();
            if (vis[u]) continue;
            vis[u] = 1;
            if (u == y) break;
            for (auto &e : adj[u]) {
                ll nd = du + e.second;
                if (nd < dist[e.first]) { dist[e.first] = nd; pq.push({nd, e.first}); }
            }
        }
        printf("%lld\n", w[x] + w[y] + dist[y]);
    }
    return 0;
}
