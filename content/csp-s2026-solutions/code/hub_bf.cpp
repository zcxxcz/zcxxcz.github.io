// hub 暴力：枚举所有大小恰为 k 的点集，判断连通块数 <= 2 并计算通勤半径
// 仅用于对拍（n <= 12）
#include <bits/stdc++.h>
using namespace std;
int n, k;
vector<int> adj[13];
int main() {
    freopen("hub.in", "r", stdin);
    freopen("hub.out", "w", stdout);
    int c, t;
    if (scanf("%d %d", &c, &t) != 2) return 0;
    while (t--) {
        scanf("%d %d", &n, &k);
        for (int i = 0; i <= n; i++) adj[i].clear();
        for (int i = 1; i < n; i++) {
            int u, v; scanf("%d %d", &u, &v);
            adj[u].push_back(v); adj[v].push_back(u);
        }
        int best = 1e9;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (__builtin_popcount(mask) != k) continue;
            // 连通块数
            vector<int> comp(n + 1, -1);
            int cc = 0;
            for (int s = 1; s <= n; s++) if ((mask >> (s - 1) & 1) && comp[s] < 0) {
                queue<int> q; q.push(s); comp[s] = cc;
                while (!q.empty()) {
                    int u = q.front(); q.pop();
                    for (int v : adj[u]) if ((mask >> (v - 1) & 1) && comp[v] < 0) comp[v] = cc, q.push(v);
                }
                cc++;
            }
            if (cc > 2) continue;
            // 多源 BFS 求半径
            vector<int> d(n + 1, -1);
            queue<int> q;
            for (int i = 1; i <= n; i++) if (mask >> (i - 1) & 1) d[i] = 0, q.push(i);
            int r = 0;
            while (!q.empty()) {
                int u = q.front(); q.pop();
                r = max(r, d[u]);
                for (int v : adj[u]) if (d[v] < 0) d[v] = d[u] + 1, q.push(v);
            }
            best = min(best, r);
        }
        printf("%d\n", best);
    }
    return 0;
}
