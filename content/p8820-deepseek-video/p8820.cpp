#include <bits/stdc++.h>
using namespace std;

static const int MAXN = 200005;
static const int LOG = 18;
static const long long INF = (long long)1e18;

int n, Q, K;
long long w[MAXN], offv[MAXN], pre[MAXN];
int dep[MAXN], par[MAXN], anc[MAXN][LOG];
vector<int> adj[MAXN];

template<int D>
struct Mat {
    long long a[D][D];
    Mat() {
        for (int i = 0; i < D; ++i)
            for (int j = 0; j < D; ++j) a[i][j] = INF;
    }
};

template<int D>
Mat<D> mul(const Mat<D>& A, const Mat<D>& B) {
    Mat<D> C;
    for (int i = 0; i < D; ++i)
        for (int k = 0; k < D; ++k) {
            long long x = A.a[i][k];
            if (x >= INF) continue;
            for (int j = 0; j < D; ++j) {
                long long y = B.a[k][j];
                if (y < INF && x + y < C.a[i][j]) C.a[i][j] = x + y;
            }
        }
    return C;
}

template<int D>
struct Vec {
    long long a[D];
    Vec() { for (int i = 0; i < D; ++i) a[i] = INF; }
};

template<int D>
Vec<D> apply_mat(const Mat<D>& A, const Vec<D>& x) {
    Vec<D> y;
    for (int i = 0; i < D; ++i)
        for (int j = 0; j < D; ++j)
            if (A.a[i][j] < INF && x.a[j] < INF)
                y.a[i] = min(y.a[i], A.a[i][j] + x.a[j]);
    return y;
}

template<int D>
Mat<D> node_matrix(int u) {
    Mat<D> M;
    if constexpr (D == 2) {
        M.a[0][0] = M.a[0][1] = w[u];
        M.a[1][0] = 0;
    } else {
        for (int j = 0; j < 5; ++j) M.a[0][j] = w[u];
        M.a[1][0] = 0;
        M.a[2][1] = 0;
        M.a[3][0] = M.a[3][1] = M.a[3][3] = offv[u];
        M.a[4][3] = 0;
    }
    return M;
}

int lca(int a, int b) {
    if (dep[a] < dep[b]) swap(a, b);
    int d = dep[a] - dep[b];
    for (int j = 0; d; ++j, d >>= 1)
        if (d & 1) a = anc[a][j];
    if (a == b) return a;
    for (int j = LOG - 1; j >= 0; --j)
        if (anc[a][j] != anc[b][j]) { a = anc[a][j]; b = anc[b][j]; }
    return par[a];
}

template<int D>
Vec<D> climb_side(int x, int p, const vector<Mat<D>>& up) {
    Vec<D> st;
    st.a[0] = w[x];
    int d = dep[x] - dep[p], cur = x;
    for (int j = 0; d; ++j, d >>= 1) {
        if (d & 1) {
            st = apply_mat(up[(size_t)cur * LOG + j], st);
            cur = anc[cur][j];
        }
    }
    return st;
}

template<int D>
void solve_matrix() {
    vector<Mat<D>> up((size_t)(n + 1) * LOG);
    for (int u = 2; u <= n; ++u) up[(size_t)u * LOG] = node_matrix<D>(par[u]);
    for (int j = 1; j < LOG; ++j) {
        for (int u = 1; u <= n; ++u) {
            if (dep[u] < (1 << j) + 1) continue;
            int mid = anc[u][j - 1];
            up[(size_t)u * LOG + j] = mul(up[(size_t)mid * LOG + (j - 1)],
                                          up[(size_t)u * LOG + (j - 1)]);
        }
    }
    while (Q--) {
        int s, t; scanf("%d%d", &s, &t);
        int p = lca(s, t);
        Vec<D> A = climb_side<D>(s, p, up);
        Vec<D> B = climb_side<D>(t, p, up);
        long long ans = INF;
        if constexpr (D == 2) {
            ans = min(ans, A.a[0] + B.a[0] - w[p]);
            ans = min(ans, A.a[0] + B.a[1]);
            ans = min(ans, A.a[1] + B.a[0]);
            ans = min(ans, A.a[1] + B.a[1]);
        } else {
            auto F = [](const Vec<5>& v, int d) -> long long { return d < 3 ? v.a[d] : INF; };
            auto G = [](const Vec<5>& v, int d) -> long long { return d < 2 ? v.a[3 + d] : INF; };
            for (int ds = 0; ds < 3; ++ds)
                for (int dt = 0; dt < 3; ++dt)
                    if (ds + dt <= 3) {
                        long long add = A.a[ds] + B.a[dt];
                        if (ds == 0 && dt == 0) add -= w[p];
                        ans = min(ans, add);
                    }
            for (int ds = 0; ds < 3; ++ds)
                for (int dt = 0; dt < 2; ++dt)
                    if (ds + dt + 1 <= 3) {
                        ans = min(ans, F(A, ds) + G(B, dt));
                        ans = min(ans, G(A, dt) + F(B, ds));
                    }
            for (int ds = 0; ds < 2; ++ds)
                for (int dt = 0; dt < 2; ++dt)
                    if (ds + dt + 2 <= 3)
                        ans = min(ans, G(A, ds) + G(B, dt));
            ans = min(ans, F(A, 2) + F(B, 2) + offv[p]);
        }
        printf("%lld\n", ans);
    }
}

int main() {
    scanf("%d%d%d", &n, &Q, &K);
    for (int i = 1; i <= n; ++i) scanf("%lld", &w[i]);
    for (int i = 1; i < n; ++i) {
        int a, b; scanf("%d%d", &a, &b);
        adj[a].push_back(b); adj[b].push_back(a);
    }
    for (int u = 1; u <= n; ++u) {
        offv[u] = INF;
        for (int v : adj[u]) offv[u] = min(offv[u], w[v]);
    }
    // iterative DFS for parent/depth/prefix sums
    vector<int> order; order.reserve(n); order.push_back(1);
    par[1] = 0; dep[1] = 1; pre[1] = w[1];
    for (size_t i = 0; i < order.size(); ++i) {
        int u = order[i];
        for (int v : adj[u]) if (v != par[u]) {
            par[v] = u; dep[v] = dep[u] + 1; pre[v] = pre[u] + w[v];
            order.push_back(v);
        }
    }
    for (int u = 1; u <= n; ++u) anc[u][0] = par[u];
    for (int j = 1; j < LOG; ++j)
        for (int u = 1; u <= n; ++u)
            anc[u][j] = anc[anc[u][j - 1]][j - 1];

    if (K == 1) {
        while (Q--) {
            int s, t; scanf("%d%d", &s, &t);
            int p = lca(s, t);
            printf("%lld\n", pre[s] + pre[t] - pre[p] - pre[par[p]]);
        }
    } else if (K == 2) {
        solve_matrix<2>();
    } else {
        solve_matrix<5>();
    }
    return 0;
}
