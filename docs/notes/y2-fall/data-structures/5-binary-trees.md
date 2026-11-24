# Binary Trees

## 1. ==Full== binary tree 
要么没有儿子，要么有俩
### 1.1 Full binary tree theorem: 
- **Theorem 1**: leaves == internal nodes + 1
- **Theorem 2**: null pointers == nodes + 1
- ps:<br/>null pointers = leaves * 2<br/>nodes = leaves + internal nodes
## 2. ==Complete== binary tree
节点都是满的，除了倒数第二行，并且最后一行必定是从左到右填充的。
### 2.1 Array-Based Complete BT: ==No overhead space==
### 2.2 Heaps(可用array-based实现)<br>
#### 2.2.1 定义：
- Complete Binary Tree
- Value stored in a heap are **partially ordered**(所以每个节点所存的值和他的子节点有关联)
#### 2.2.2 两种不同heaps:
- Min-heap: $\le$child values（从上而下是从小到大）
- Max-heap: $\ge$child values（从大到小）
#### 2.2.3 [Sift down](https://webdocs.cs.ualberta.ca/~holte/T26/heap-sift-down.html)
大概意思就是，把一个目标值往下挪动，直到它比它的两个孩子都要大为止（针对的是创建max-heap的时候）

需要注意的是，我们在build heap的时候并不需要对叶节点使用sift down，所以实际上需要遍历的节点数为==n/2 - 1==（抛弃小数点），而且遍历的顺序是从==下面的节点==开始sift down（感觉有点像插入排序，下面的heap是已经排好序的，然后上面的节点就插入到下面合适的位置）

ps: 事实证明，在创建序列时，buildheap函数比一个个insert要更加高效

#### 2.2.4 priority queues
可以用max-heap来解决，每次收到请求的时候就释放最优先的object（也就是处在最顶上的object）

当然这个实际上也可以用linked list实现，只不过算法的复杂度各有优劣而已

## 3 Traversals
a process for visiting the nodes in some order

### 3.1 enumeration
any traversal that lists every node in the tree exactly once
 ### 3.2 ==preorder== traversal
先爸爸，再两个儿子
### 3.3 ==postorder== traversal
先儿子，再爸爸
### 3.4 ==inorder== traversal traversal
先左儿子，再爸爸，再右儿子
## 4. Different Leafs & Internal Nodes
基本思想是Internal nodes和leaves储存不同类型的数据
三种不同的实现形式：
- Union
- Inheritance
- Inheritance with virtual function
## 5. Space Requirements:
### 5.1 Overhead Space
any space not used to store the data records
### 5.2 Overhead Fraction
$\frac{overhead space}{total space}$
## 6. Binary Search Trees:(BST)
定义：对每个结点来说，所存的数值：<br>left < self <= right（注意相等的情况在右子树里面）
## 7 Huffman Coding Trees
### 7.1 Huffman Coding
An entropy encoding algorithm used for lossless **data compression**. Use a **variable-length** code table(根据不同字母的出现频率来决定需要的存储空间，出现的**多**的字母就用**短**的字节来表示)
### 7.2 Huffman Coding Trees
- 每次结合两个最小的值，就得到了树。这样可以保证**带权路径**最小（就是大的值离顶点近）
- 因为Huffman Coding有prefix property(No code in the set is the prefix of another)，这样就可以用树来表示独特的一串字符