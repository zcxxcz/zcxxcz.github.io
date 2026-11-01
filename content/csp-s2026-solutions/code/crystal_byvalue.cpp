// crystal 部分分 3：值域很小时按值计数（测试点 10~12：|a_i| <= 100, m <= 1e8）
// 枚举最终能量值 V（在值域内），价值 a 的水晶改成 V 的代价是 V-a >= 0，
// 显然优先用代价小的（也就是 a 大的），于是从 a=V 往下贪心取，直到 m 用完。
// O(V^2)，与 n 无关。
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    freopen("crystal.in", "r", stdin);
    freopen("crystal.out", "w", stdout);
    int n; ll m;
    scanf("%d %lld", &n, &m);
    const int LO = -105, HI = 105;
    vector<ll> c(HI - LO + 1, 0);
    for (int i = 1; i <= n; i++) { ll a; scanf("%lld", &a); c[a - LO]++; }
    int ans = 1;
    for (int V = LO; V <= HI; V++) {
        ll rest = m, got = 0;
        for (int a = V; a >= LO; a--) {
            ll cntv = c[a - LO];
            if (!cntv) continue;
            ll unit = V - a;
            if (unit == 0) { got += cntv; continue; }
            ll can = rest / unit;
            if (can >= cntv) { rest -= cntv * unit; got += cntv; }
            else { got += can; rest = 0; break; }
        }
        if (got > ans) ans = (int)got;
    }
    printf("%d\n", ans);
    return 0;
}
