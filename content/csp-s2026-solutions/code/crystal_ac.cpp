// crystal 正解：排序 + 前缀和 + 对每个“目标值”二分个数，O(n log n)
// 关键结论：若最终能量值定为 a[r]，则选 a[r] 前面（含自己）最大的 k 个最省，
//           代价 cost(r,k) = k*a[r] - (pre[r]-pre[r-k])，对 k 单调不降 -> 可二分
// 期望得分：100
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef __int128 lll;
int n; ll m;
int main() {
    freopen("crystal.in", "r", stdin);
    freopen("crystal.out", "w", stdout);
    scanf("%d %lld", &n, &m);
    vector<ll> a(n + 1), pre(n + 1, 0);
    for (int i = 1; i <= n; i++) scanf("%lld", &a[i]);
    sort(a.begin() + 1, a.end());
    for (int i = 1; i <= n; i++) pre[i] = pre[i - 1] + a[i];
    int ans = 1;
    for (int r = 1; r <= n; r++) {
        int lo = 1, hi = r, best = 0;
        while (lo <= hi) {
            int k = (lo + hi) >> 1;
            lll cost = (lll)k * a[r] - (lll)(pre[r] - pre[r - k]);
            if (cost <= (lll)m) best = k, lo = k + 1;
            else hi = k - 1;
        }
        ans = max(ans, best);
    }
    printf("%d\n", ans);
    return 0;
}
