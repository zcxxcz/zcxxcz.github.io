// crystal 部分分 1：n <= 5 的暴力（枚举子集）
// 期望得分：测试点 1,2（20 分）
#include <bits/stdc++.h>
using namespace std;
int n; long long m; long long a[10];
int main() {
    freopen("crystal.in", "r", stdin);
    freopen("crystal.out", "w", stdout);
    scanf("%d %lld", &n, &m);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int ans = 1;
    for (int mask = 1; mask < (1 << n); mask++) {
        long long mx = LLONG_MIN, sum = 0; int cnt = 0;
        for (int i = 0; i < n; i++) if (mask >> i & 1) {
            mx = max(mx, a[i]); sum += a[i]; cnt++;
        }
        long long cost = (long long)cnt * mx - sum;  // 全部抬到组内最大值
        if (cost <= m) ans = max(ans, cnt);
    }
    printf("%d\n", ans);
    return 0;
}
