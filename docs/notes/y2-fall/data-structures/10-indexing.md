### 1. Introduction
承接上一节Searching, 这一节Tree Indexing也是一种搜索方法

- Entry-sequenced File
    - 按照加入的顺序存储
    - 搜索非常没有效率
        - solution: 可以通过按照某个值来排序，但是依旧无法处理多键值搜索
- Indexing
    - 字典一样
    - 两种Key:
        - Primary Key: 每个数据唯一的Key，但是搜索起来不是很方便，所以意义不大
        - Secondary Key: 一般来说都不是唯一的Key, 但是经常使用，比如查字典的时候查开头的字母
### 2. Linear Index
Key value是已经排序好的状态，原数列并不是
- Second-level index: 如果index数量太多了，那就再提取出一层数量更少的新的index，有点像二叉搜索树那种样子。对应于secondary key search
    - 缺点：
        - index update is expensive
        - 有相同key/secondary key的记录会浪费空间
    - Inverted Index
        - 从secondary key开始搜索，接着搜到primary key，最后目标值
        - 针对缺点2，我们记录secondary key和primary key之间的联系，这样就节省了空间(定长数组)
        - 这个方法也是有缺点的，就是这个存储两种key的数组若用二维定长数组，就会浪费一些内存
            - 解决方案：用链表？<br>其实并不好，如果这些数据被存储在了硬盘里，数据有可能分散在硬盘各个角落，查找起来就慢的很了
            - 解决方案：每个secondary key都各自储存一个对应的各自长度互不相同的primary key列表（其实早就应该这样做了。。。第一反应就是这种）
            - 解决方案：Combining the lists into one array-based list, 就是secondary key指向自己对应的第一个primary key，primary key之间存储next关系(你就非要用array based实现链表一样的意思吗？？？)
### 3. Tree Index
前面的都是弟弟，树搜索才是爹。

二叉搜索树合不合适呢？

很可惜，不合适，因为：
- unbalanced的问题
- 反正就是会使得垃圾硬盘带不动
### 4. 2-3 Tree
爷就是梦中情树
特点：
- 每个node包含一个或者两个key
- 每个internal node包含两个children(one key的情况)或者三个children(two keys)
- 所有leaf nodes都位于树的同一个层级上，所以永远是height balanced
- insert操作也有比较复杂的，可以看ppt33, 35, 39
deletion比较复杂，似乎大概了解下就行了
### 5. B-Tree
2-3树的**generalization**
B-Tree of order $b$的特点：
- the root is either a leaf or has at least two children
- ==中间节点==有$\lceil \frac{b}{2}\rceil$到$b$个children
- 同2-3树的第三个特点
- 注意b指的是children的数量，而不是一个节点里列表的长度
### 6. $B^+$Tree
最常用的B-Tree implementation

特点：
- internal nodes不储存record，而是储存个别key value来引导搜索。数据都实际储存于leaf node
- 每个==Leaf node==储存$\lceil \frac{t}{2}\rceil$到$t$个值，t是数组最大长度(其实只有root node不要求至少满一半)
- 永远至少half full
- 平均搜索复杂度是$\Theta(log_bn)d$
- 叶节点是按照search key==排好了顺序==的

### 7. Space Analysis
MIN number of records in N level must be smaller than or equal to MAX number of records in N-1 level