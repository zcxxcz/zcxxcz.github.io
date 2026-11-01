// migrate 部分分 1：n <= 300，最朴素的 O(n^3) 分层 DP
// 期望得分：测试点 1~6（24 分）
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    freopen("migrate.in", "r", stdin);
    freopen("migrate.out", "w", stdout);
    int c, t;
    if (scanf("%d %d", &c, &t) != 2) return 0;
    while (t--) {
        int n; ll d;
        scanf("%d %lld", &n, &d);
        vector<ll> x(n + 1);
        for (int i = 1; i <= n; i++) scanf("%lld", &x[i]);
        vector<int> nxt(n + 2, 0);
        for (int i = 1; i <= n; i++) {          // nxt[i]: 一步能到的最右岛
            int j = i;
            while (j + 1 <= n && x[j + 1] - x[i] <= d) j++;
            nxt[i] = j;
        }
        ll ans = 0;
        for (int u = 1; u <= n; u++) {           // 枚举起点，在分层 DAG 上数最短路
            vector<int> dist(n + 1, 1e9);
            vector<ll> cnt(n + 1, 0);
            dist[u] = 0; cnt[u] = 1;
            for (int v = u + 1; v <= n; v++) {
                int best = 1e9; ll s = 0;
                for (int i = u; i < v; i++) {    // 枚举前驱
                    if (nxt[i] < v) continue;
                    if (dist[i] + 1 < best) { best = dist[i] + 1; s = cnt[i]; }
                    else if (dist[i] + 1 == best) s += cnt[i];
                }
                dist[v] = best; cnt[v] = s;
                if (s == 2) ans++;
            }
        }
        printf("%lld\n", ans);
    }
    return 0;
}
