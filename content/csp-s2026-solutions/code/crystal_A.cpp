// crystal 部分分：特殊性质 A（a_i = i），O(1)
// 结论：排序后取连续 k 个（结尾为 r），代价 = k*r - (r-k+1 + ... + r) = k(k-1)/2，
//       与 r 无关！所以只要最大的 k 使 k(k-1)/2 <= m，再与 n 取 min。
// 期望得分：测试点 13~15（累计 75）
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef __int128 lll;
int n; ll m;

// 最大的 k 使 k(k-1)/2 <= m（k 用 __int128 防溢出）
ll solve(ll m) {
    // k 的上界约 1.5e9（m <= 1e18 时），二分即可，不必推公式
    ll lo = 1, hi = 2000000000LL, best = 1;
    while (lo <= hi) {
        ll mid = lo + (hi - lo) / 2;
        lll cost = (lll)mid * (mid - 1) / 2;
        if (cost <= (lll)m) best = mid, lo = mid + 1;
        else hi = mid - 1;
    }
    return best;
}

int main() {
    freopen("crystal.in", "r", stdin);
    freopen("crystal.out", "w", stdout);
    scanf("%d %lld", &n, &m);
    for (int i = 1; i <= n; i++) {
        ll x;
        scanf("%lld", &x);  // 性质 A 下保证 x == i，直接丢弃
    }
    ll k = solve(m);
    if (k > n) k = n;       // 不能超过总数
    if (k < 1) k = 1;       // 单颗水晶代价 0，至少 1 颗
    printf("%lld\n", k);
    return 0;
}
