// crystal 部分分：特殊性质 B（a 是等差数列），O(log n)
// 设公差 d（可能为负，排序后按 |d| 算）。连续 k 个（结尾为 r）的代价
//   = k*a[r] - (a[r] + a[r-1] + ... + a[r-k+1]) = |d| * k(k-1)/2
// 与 r 无关，于是答案 = min(n, 最大的 k 使 |d|*k(k-1)/2 <= m)。
// 特判 d = 0：全部相同，直接输出 n。
// 期望得分：测试点 16~18（累计 90）
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef __int128 lll;
int n; ll m;
ll a[500005];

int main() {
    freopen("crystal.in", "r", stdin);
    freopen("crystal.out", "w", stdout);
    scanf("%d %lld", &n, &m);
    for (int i = 1; i <= n; i++) scanf("%lld", &a[i]);

    if (n == 1) { printf("1\n"); return 0; }

    sort(a + 1, a + n + 1);               // 升序后相邻差就是 |d|
    ll d = a[2] - a[1];
    if (d == 0) {                         // 全是同一个值，一颗石头都不用动
        printf("%d\n", n);
        return 0;
    }

    int lo = 1, hi = n, best = 1;         // 至少 1 颗（代价 0）
    while (lo <= hi) {
        int mid = (lo + hi) >> 1;
        lll cost = (lll)d * mid * (mid - 1) / 2;
        if (cost <= (lll)m) best = mid, lo = mid + 1;
        else hi = mid - 1;
    }
    printf("%d\n", best);
    return 0;
}
