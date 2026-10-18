#include <algorithm>
#include <array>
#include <cstdio>
#include <vector>
using namespace std;
using ll = long long;
const ll INF = 4000000000000000000LL;
int K;
struct FastInput {
    int get() { int x=0,c=getchar_unlocked(); while(c<48||c>57)c=getchar_unlocked();
        while(c>=48&&c<=57){x=x*10+c-48;c=getchar_unlocked();} return x; }
} in;
struct Mat { ll a[3][3]; Mat() { for(auto &r:a)for(ll &x:r)x=INF; } };
Mat identity() { Mat x;for(int i=0;i<K;i++)x.a[i][i]=0;return x; }
// Column vectors: applying A, then B, is B*A. Multiplication is (min,+).
Mat mul(const Mat &b,const Mat &a) {
    Mat c;
    for(int i=0;i<K;i++)for(int h=0;h<K;h++)if(b.a[i][h]<INF)
        for(int j=0;j<K;j++)if(a.a[h][j]<INF)
            c.a[i][j]=min(c.a[i][j],b.a[i][h]+a.a[h][j]);
    return c;
}
void apply_mat(const Mat &a,array<ll,3>&v) {
    array<ll,3> z{INF,INF,INF};
    for(int i=0;i<K;i++)for(int j=0;j<K;j++)
        if(a.a[i][j]<INF && v[j]<INF)z[i]=min(z[i],a.a[i][j]+v[j]);
    v=z;
}
Mat local(ll w,ll b) {
    Mat a;for(int j=0;j<K;j++)a.a[0][j]=w;
    if(K>=2)a.a[1][0]=0;
    if(K==3){a.a[1][1]=b;a.a[2][1]=0;}
    return a;
}
struct SegmentTree {
    int base;vector<Mat> f,r;
    SegmentTree(const vector<int>&rev,const vector<ll>&w,const vector<ll>&b) {
        int n=(int)rev.size()-1;base=1;while(base<n)base*=2;
        f.assign(2*base,identity());r=f;
        for(int i=1;i<=n;i++)f[base+i-1]=r[base+i-1]=local(w[rev[i]],b[rev[i]]);
        for(int p=base-1;p;p--){f[p]=mul(f[2*p+1],f[2*p]);r[p]=mul(r[2*p],r[2*p+1]);}
    }
    void consume(int l,int rr,bool backwards,array<ll,3>&v)const {
        int left[32],right[32],nl=0,nr=0;
        for(l+=base-1,rr+=base-1;l<=rr;l/=2,rr/=2){
            if(l&1)left[nl++]=l++;
            if(!(rr&1))right[nr++]=rr--;
        }
        if(!backwards){
            for(int i=0;i<nl;i++)apply_mat(f[left[i]],v);
            for(int i=nr-1;i>=0;i--)apply_mat(f[right[i]],v);
        }else{
            for(int i=0;i<nr;i++)apply_mat(r[right[i]],v);
            for(int i=nl-1;i>=0;i--)apply_mat(r[left[i]],v);
        }
    }
};
int main(){
    int n=in.get(),q=in.get();K=in.get();
    vector<ll>w(n+1),b(n+1,INF);for(int i=1;i<=n;i++)w[i]=in.get();
    vector<vector<int>>g(n+1);
    for(int i=1;i<n;i++){
        int u=in.get(),v=in.get();g[u].push_back(v);g[v].push_back(u);
        b[u]=min(b[u],w[v]);b[v]=min(b[v],w[u]);
    }
    vector<int>pa(n+1),dep(n+1),sz(n+1,1),heavy(n+1),order{1};
    // Iterative traversal is safe for an n-vertex chain.
    for(size_t i=0;i<order.size();i++){
        int u=order[i];for(int v:g[u])if(v!=pa[u]){pa[v]=u;dep[v]=dep[u]+1;order.push_back(v);}
    }
    for(int i=n-1;i>0;i--){int u=order[i],p=pa[u];sz[p]+=sz[u];if(sz[u]>sz[heavy[p]])heavy[p]=u;}
    vector<int>top(n+1),pos(n+1),rev(n+1),heads{1};int timer=0;
    for(size_t i=0;i<heads.size();i++){
        int h=heads[i];for(int u=h;u;u=heavy[u]){
            top[u]=h;pos[u]=++timer;rev[timer]=u;
            for(int v:g[u])if(pa[v]==u&&v!=heavy[u])heads.push_back(v);
        }
    }
    // For each heavy-chain prefix: down[u] processes top[u] -> u,
    // up[u] processes u -> top[u]. These avoid a segment query per chain.
    vector<Mat>down(n+1),up(n+1);
    for(int i=1;i<=n;i++){
        int u=rev[i];Mat a=local(w[u],b[u]);
        if(top[u]==u)down[u]=up[u]=a;
        else{down[u]=mul(a,down[pa[u]]);up[u]=mul(up[pa[u]],a);}
    }
    SegmentTree seg(rev,w,b);
    while(q--){
        int s=in.get(),t=in.get(),pending[32],np=0;
        // This seed forces the first processed vertex s to be selected.
        array<ll,3>v{INF,INF,INF};v[K-1]=0;
        while(top[s]!=top[t]){
            if(dep[top[s]]>=dep[top[t]]){apply_mat(up[s],v);s=pa[top[s]];}
            else{pending[np++]=t;t=pa[top[t]];}
        }
        if(dep[s]>=dep[t])seg.consume(pos[t],pos[s],true,v);
        else seg.consume(pos[s],pos[t],false,v);
        while(np)apply_mat(down[pending[--np]],v);
        printf("%lld\n",v[0]); // State zero forces the destination t to be selected.
    }
}
