// migrate 部分分 4：特殊性质 B —— 存在一座能从它直飞任意其他岛的“枢纽岛”
// 于是任意两岛的岛间距离 <= 2：能一步到就只有 1 条；否则恰为 2 步，
// 最短路径条数 = 能同时被 u 和 v 一步到达的中间岛个数 = R(u)-L(v)+1（区间计数）。
// 等于 2 即 R(u) = L(v)+1，用 O(n) 统计即可。
// 期望得分：测试点 13,14（56 分）
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
        vector<int> R(n + 2, 0), L(n + 2, n + 1);
        int j = 1;
        for (int i = 1; i <= n; i++) {              // R(i)：i 一步能到的最右岛
            if (j < i) j = i;
            while (j + 1 <= n && x[j + 1] - x[i] <= d) j++;
            R[i] = j;
        }
        int k = 1;
        for (int v = 1; v <= n; v++) {              // L(v)：一步能到 v 的最左岛
            while (k <= n && R[k] < v) k++;
            if (k <= n) L[v] = k; else L[v] = n + 1;
        }
        vector<ll> cntR(n + 2, 0);                  // cntR[z] = #{u : R(u)=z}
        for (int u = 1; u <= n; u++) cntR[R[u]]++;
        ll ans = 0;
        for (int v = 1; v <= n; v++) {
            if (L[v] > n) continue;                 // 没人能一步到 v
            int z = L[v] + 1;                       // 需要 R(u) = z，且 u < L(v)
            if (z > n) continue;
            ll c0 = cntR[z];
            if (z - 1 >= 1 && R[z - 1] == z) c0--;  // 去掉 u = z-1
            if (z <= n && R[z] == z) c0--;          // 去掉 u = z
            if (c0 > 0) ans += c0;
        }
        printf("%lld\n", ans);
    }
    return 0;
}
