### Introduction

### $\Theta(n^2)$Sorting

- Bubble Sort
    - Smaller value "bubble" up
    - 假定我们要让序列从小到大的排列，那么就从该序列的最底部开始，相邻的两个数进行比较。若小的数字在下面则交换至上面。然后比较的pair上移一格。**如此循环下去，便可以找到当前寻找的序列里的最小值，最小值便出现在了顶部**。接下来我们便不管最顶部的最小值们，考虑剩下的序列的最小值，用同样的方法重复。。。
- Selection Sort
    - Bubble Sort的改进版本
    - 既然冒泡排序里每次都是要寻找当前序列里的最小值，那干脆直接找到那个最小值所在的位置，然后**直接将最小值交换至顶部（不需要一格一格地挪上去）**

- Insertion Sort
    - 把值加到已经排序好的序列的正确位置

以上的排序方法都叫exchanged sorting

- Shell Sort: 似乎是没讲
    - 插入排序能更有效率，如果该列表是nearly sorted 的状态
    - 预处理挺神奇的。。。看看课件

### $\Theta(nlogn)$Sorting

- Quick Sort
    - Fastest known general-purpose in-memory sorting algorithm in average case
    - 事实上是借助了二叉搜索树
    - 大致算法是：选择当前序列的中间那个数，然后把剩下的数，小于他的排左边，大于他的排右边；接下来再对左边和右边的序列做同样的取中间数的操作，以此类推。最终就可建立一个二叉搜索树
    - 长度太短时应该避免使用快排
- Merge Sort
    - 用来合并两个已经排序好的数列
    - 每次比较两个序列中的最小值，把更小的那个拿出来放到新的合并的数组里
    - 优化：
        - 对于数量较小的sublist，就用插入排序来搞，不用递归来call自己
        - 让左右两个sublist向着对方的方向遍历，这样就不用检查是否到达列表终点了
- Heap Sort
    - 快排可能会遇到最坏的情况，但是heap sort不会遇到
- Bin Sort（桶排）
    - 你很熟悉
    - 劣势：空间浪费
- Radix Sort
    - 桶排的改良版
    - 先排各位，再排十位，以此类推，这样桶的数量就是比较小的了
    - 桶的数量可以根据需求来更改，但根据二进制来看，它们的数量都是2的次方
    - 开销：$\Theta(k(n+r))$

### Empirical Comparison

快排的缺点：相同值的元素的相对顺序会被打乱。

