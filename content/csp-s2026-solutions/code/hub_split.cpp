// hub 部分分：二分答案 + 枚举“断哪条边” + 两侧分别逐轮剥叶
// 结论：一个连通块时的最小点数 = 逐轮剥叶后“轮数 > R”的点数（R-核心）；
//       两个连通块 = 把某条边断开，两侧各取自己的 R-核心，点数相加。
// O(n^2 log n)，可过 n<=4000（测试点 4~10，约 35 分）
#include <bits/stdc++.h>
using namespace std;
static int n, k;
static vector<int> head, eto, enxt;
static vector<int> mark, lev, deg;
static int tag = 0;
static vector<int> nodes, bfs, q;

// 对 nodes（当前 tag 标记的点集，必须连通）做逐轮剥叶，返回“轮数 > R”的点数
static int coreSize(int R) {
    for (int i = 0; i < (int)nodes.size(); i++) { int u = nodes[i]; deg[u] = 0; lev[u] = 0; }
    for (int i = 0; i < (int)nodes.size(); i++) {
        int u = nodes[i];
        for (int e = head[u]; e != -1; e = enxt[e]) if (mark[eto[e]] == tag) deg[u]++;
    }
    q.clear();
    for (int i = 0; i < (int)nodes.size(); i++) {
        int u = nodes[i];
        if (deg[u] <= 1) { lev[u] = 1; q.push_back(u); }
    }
    for (int h = 0; h < (int)q.size(); h++) {
        int u = q[h];
        for (int e = head[u]; e != -1; e = enxt[e]) {
            int v = eto[e];
            if (mark[v] != tag || lev[v]) continue;
            if (--deg[v] <= 1) { lev[v] = lev[u] + 1; q.push_back(v); }
        }
    }
    int c = 0;
    for (int i = 0; i < (int)nodes.size(); i++) if (lev[nodes[i]] > R) c++;
    // 核心为空时仍至少要放一座基地
    return c > 0 ? c : 1;
}

// 从 s 出发、不跨越边 (s0,t0) 收集一侧连通块，返回点集大小化在 nodes 里
static void collect(int s, int banned) {
    tag++;
    nodes.clear(); bfs.clear();
    bfs.push_back(s); mark[s] = tag;
    for (int i = 0; i < (int)bfs.size(); i++) {
        int x = bfs[i];
        nodes.push_back(x);
        for (int f = head[x]; f != -1; f = enxt[f]) {
            int y = eto[f];
            if (y == banned || mark[y] == tag) continue;
            mark[y] = tag; bfs.push_back(y);
        }
    }
}

int main() {
    freopen("hub.in", "r", stdin);
    freopen("hub.out", "w", stdout);
    int c, t;
    if (scanf("%d %d", &c, &t) != 2) return 0;
    while (t--) {
        scanf("%d %d", &n, &k);
        head.assign(n + 1, -1);
        eto.assign(2 * (n + 1), 0); enxt.assign(2 * (n + 1), 0);
        int ec = 0;
        vector<pair<int, int> > es;
        for (int i = 1; i < n; i++) {
            int u, v; scanf("%d %d", &u, &v);
            eto[ec] = v; enxt[ec] = head[u]; head[u] = ec++;
            eto[ec] = u; enxt[ec] = head[v]; head[v] = ec++;
            es.push_back(make_pair(u, v));
        }
        mark.assign(n + 1, 0); lev.assign(n + 1, 0); deg.assign(n + 1, 0);
        nodes.reserve(n); bfs.reserve(n); q.reserve(n);
        auto feasible = [&](int R) -> bool {
            collect(1, 0);                       // 情况一：一个连通块
            if (coreSize(R) <= k) return true;
            for (auto &e : es) {                 // 情况二：断开一条边
                int a = e.first, b = e.second;
                collect(a, b);
                int tot = coreSize(R);
                if (tot > k) continue;
                collect(b, a);
                tot += coreSize(R);
                if (tot <= k) return true;
            }
            return false;
        };
        int lo = 0, hi = n, ans = n;
        while (lo <= hi) {
            int mid = (lo + hi) >> 1;
            if (feasible(mid)) { ans = mid; hi = mid - 1; }
            else lo = mid + 1;
        }
        printf("%d\n", ans);
    }
    return 0;
}
