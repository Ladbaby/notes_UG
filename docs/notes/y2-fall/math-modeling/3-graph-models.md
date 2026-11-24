# Graph Models

### 1.最短路径问题

* [Dijkstra's algorithm（迪克斯特拉算法）](https://www.programiz.com/dsa/dijkstra-algorithm)（ppt讲的乱七八糟的）

### 2.Traveling Salesman Problem

* 可以用Integer Programming 解决，但是效率很低。应该保证不会出现两个以上的闭环
* 反正就是没有很好的算法来解决

### 3.Maximum Flow Problem

* [最大流最小割定理](https://zhuanlan.zhihu.com/p/65793018)（ppt里啥都没解释）这只是个为了接下来的方法提供证明的定理
* [Maximum-Flow Algorithm](https://www.jianshu.com/p/efb2d79e2b0f)这才是核心算法，对于反向边这一虚拟概念的引入，可参考链接中对于反向边的举例解释

### 4.Graph Matching

* bipartite二分图
    * matching: bipartite的一个子集，且没有共享终点的两条边
    * maximum matching问题就是找到用了最多边数的matching
        * 解决这类问题的方法：
        * Maximal flow algorithm: 额外加入s点和t点，就可转化问题
        * Kuhn-Munkres Algorithm
        * Hungarian algorithm(这俩不要求掌握)

### 5.Tree-based Problems

* [Minimum Spanning Tree](https://www.programiz.com/dsa/spanning-tree-and-minimum-spanning-tree)
    * 解法：[Kruskal’s Algorithm](https://www.programiz.com/dsa/kruskal-algorithm#:~:text=Kruskal%27s%20algorithm%20is%20a%20minimum%20spanning%20tree%20algorithm,in%20the%20hopes%20of%20finding%20a%20global%20optimum.)（基于Greedy Algorithm）
* [Steiner Tree](https://www.geeksforgeeks.org/steiner-tree/)（相比于minimum spanning tree，这个可以包含一些非end point，作用是辅助链接endpoint。）
    * 一般而言都是没有通解的

### 6.Graph Coloring

### 7.Project Scheduling

### 8.Social Network