// migrate 部分分 3：特殊性质 A —— x 是等差数列
// 设公差 s、一步最多跨 m = floor(d/s) 个岛。则从 u 到 v 走 k = ceil(Δ/m) 步，
// 最短路径条数 = 把 Δ 拆成 k 个 [1,m] 正整数之和的方案数。
// k=2 时方案数为 2m-Δ+1，等于 2 只在 Δ = 2m-1（且 m>=2）；k>=3 时方案数已 >= 3。
// 所以答案 = 满足 Δ = 2m-1 的岛对数 = max(0, n-(2m-1))。
// 期望得分：测试点 11,12（48 分）
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
        ll step = (n >= 2) ? x[2] - x[1] : 1;
        ll m = d / step;                 // 一步最多跨多少段
        if (m > n) m = n;
        ll ans = 0;
        if (m >= 2 && 2 * m - 1 <= n - 1) ans = n - (2 * m - 1);
        printf("%lld\n", ans);
    }
    return 0;
}
