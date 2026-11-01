// migrate 部分分 2：逐起点“按层推进 + 层内前缀和”，O(n^2)
// 观察：第 t 层是区间 (P_{t-1}, P_t]（P_t = 从起点跳 t 次能到的最右岛），
//       层内 cnt(v) = 上一层中 [max(f(v), P_{t-2}+1), P_{t-1}] 的 cnt 之和，
//       用上一层的前缀和 O(1) 求出。
// 期望得分：测试点 7~10（n<=5000），共 40 分
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
static ll x[5005];
static int R[5005], fst[5005];
static ll cnt[5005], pref[5005];
int main() {
    freopen("migrate.in", "r", stdin);
    freopen("migrate.out", "w", stdout);
    int c, t;
    if (scanf("%d %d", &c, &t) != 2) return 0;
    while (t--) {
        int n; ll d;
        scanf("%d %lld", &n, &d);
        for (int i = 1; i <= n; i++) scanf("%lld", &x[i]);
        int j = 1;
        for (int i = 1; i <= n; i++) {           // 双指针求 R
            if (j < i) j = i;
            while (j + 1 <= n && x[j + 1] - x[i] <= d) j++;
            R[i] = j;
        }
        int k = 1;
        for (int v = 1; v <= n; v++) {           // f(v) = 最左能一步到 v 的岛
            while (k <= n && R[k] < v) k++;
            fst[v] = k;
        }
        ll ans = 0;
        for (int u = 1; u <= n; u++) {
            if (R[u] == u) continue;
            int q = u, p = R[u];                 // 第 1 层 = (u, R[u]]，cnt 全 1
            for (int i = q + 1; i <= p; i++) cnt[i] = 1;
            pref[q] = 0;
            for (int i = q + 1; i <= p; i++) pref[i] = pref[i - 1] + cnt[i];
            while (R[p] > p) {
                int qq = p, tt = R[p];
                for (int v = p + 1; v <= tt; v++) {
                    int lo = max(fst[v], q + 1);
                    ll s = (lo <= p) ? (pref[p] - pref[lo - 1]) : 0;
                    cnt[v] = s;
                    if (s == 2) ans++;
                }
                q = qq; p = tt;
                pref[q] = 0;
                for (int i = q + 1; i <= p; i++) pref[i] = pref[i - 1] + cnt[i];
            }
        }
        printf("%lld\n", ans);
    }
    return 0;
}
