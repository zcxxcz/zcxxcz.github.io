// subway 部分分 2：特殊性质 A（每条线路至多经过 2 个站，即 k_i <= 2）
// 此时一条线路就是站点图上的一条边，边权 = 两端站台耗时之和
// 站点数 m <= Σk <= 400，直接 Floyd
// 期望得分：测试点 7,8（8 分）
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
    vector<vector<ll> > D(m, vector<ll>(m, INF));
    for (int i = 0; i < m; i++) D[i][i] = 0;
    for (int i = 0; i < n; i++) {
        int k; scanf("%d", &k);
        int a[3]; ll t[3];
        for (int j = 0; j < k; j++) { scanf("%d %lld", &a[j], &t[j]); a[j]--; }
        if (k == 2) {                       // 一条线路 = 一条边
            ll cst = t[0] + t[1];
            if (cst < D[a[0]][a[1]]) D[a[0]][a[1]] = D[a[1]][a[0]] = cst;
        }
    }
    for (int k = 0; k < m; k++)
        for (int i = 0; i < m; i++) {
            if (D[i][k] == INF) continue;
            for (int j = 0; j < m; j++)
                if (D[k][j] != INF && D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
        }
    while (q--) {
        int x, y; scanf("%d %d", &x, &y); x--; y--;
        printf("%lld\n", w[x] + w[y] + D[x][y]);
    }
    return 0;
}
