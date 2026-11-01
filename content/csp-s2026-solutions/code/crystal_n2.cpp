// crystal 部分分 2：排序后枚举“最大值”，逐个往前加，O(n^2)
// 期望得分：测试点 1~9（45 分）
#include <bits/stdc++.h>
using namespace std;
int n; long long m;
int main() {
    freopen("crystal.in", "r", stdin);
    freopen("crystal.out", "w", stdout);
    scanf("%d %lld", &n, &m);
    vector<long long> a(n + 1);
    for (int i = 1; i <= n; i++) scanf("%lld", &a[i]);
    sort(a.begin() + 1, a.end());
    int ans = 1;
    for (int r = 1; r <= n; r++) {              // 目标值 = a[r]
        long long cost = 0;
        for (int k = 1; k <= r; k++) {          // 取 a[r-k+1..r] 这 k 个
            cost += a[r] - a[r - k + 1];        // 第 k 个水晶的代价
            if (cost <= m) ans = max(ans, k);
            else break;                          // 代价单调不降，可以直接 break
        }
    }
    printf("%d\n", ans);
    return 0;
}
