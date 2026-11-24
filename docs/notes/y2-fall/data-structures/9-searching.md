### Introduction
type of search:
- successful
- unsuccessful

### Sequential and List Method
- unsorted lists: sequential search
    - 可以通过把访问概率高的放在前面 来提高效率
- sorted lists
    - binary search
    - jump search: check every $r^{th}$element
    - interpolation search: 查字典的时候直接跳转到对应字母开头的页码
- self-organizing lists
    - 先预先排序一下，来让sequential search更加高效
    - heuristic:
        - Move-to-front: when a record is found, move it to the front of the list
        - Count: 统计每个字符出现的次数
        - Transpose: when a record is found, swap it with the record ahead of it
    - Application: Text Compression
        - use Move-to-Front heuristic
        - if a word not yet seen, send the word
        - else, send current index in the table
        - 具体过程比较神奇，看课件
### Direct Access by Key Value
Hashing: the process of mapping a key value to a position in a table
这不就是字典吗？？？（确实，是字典的一种）
- Hash function($h(k)$): maps key values(k) to positions
- Hash table($HT$): 字典

但是这会遇到问题，hash function没法保证两个不同的物体一定会拿到不同的键值。

solutions:
- Linked List
    - 每个slot都只是一个链表的头部（感觉就是开了一个二维数组）
    - Advantage: 删除很方便
    - Disadvantage: 链表中分配内存会让程序变得缓慢（new\delete）
- Bucket Hashing
    - 每个slot实际上是由更多的小slot组成的（和上一个的想法一样，只不过实际的实现是用定长数组而已）；如果又被填满了那就扔到overflow的数组里面
    - Disadvantage: 如果有超多数据被放在了overflow里面，搜索就变得很慢了
- Probing
    - 根据某种规则把数据往后推，尝试找到一个空位
    - Probe Function: $p(i)$
接下来就是各个probe function的比较：
- Linear Probing: 
    - $p(i)=i$
    - Drawback: 数据会聚集在一起
    - Improvement: $p(i)=i\times c$
        - 注意c不能随便取，不能是数组总长度的因数，不然循环下来永远只会访问固定的几个位置
        - secondary clustering: 事实上尝试的位置的顺序是固定的，这样还是会做一些无用功，走以前的数走过的路。Quadratic probing也是这个问题
- Random Probing（真随机）
    - 显然是行不通的，虽然是很随机，但是问题是后续找不回来
- Pseudo-Random Probing（伪随机）
    - 专门存储一个Probe Sequence，是当前数组随机shuffle之后的样子，表示偏移量。这样在找回数据的时候就是直接访问Probe Sequence而不是计算Probe Function
    - Disadvntage: 显然也是被secondary clustering困扰的
- Double Probing
    - 为了避免secondary clustering，我们用两个hash function
    - $h()$: 决定我们的起始位置: $h(k)=home$
    - $h2()$: 决定每一步的长度: $p(k, i)=i*h2(k)$，注意这个函数的结果也要和数组的总长度互质。

### Deletion
- 如果真的删除，那么搜索的时候到这个位置时就会停下来，妨碍了搜索。
- Tombstones: 在删除的元素处标记，搜索的时候跳过就可以了
    - 缺点：删的元素多了，就会多做很多无用功
- Local Reorganization: 用其它元素去覆盖掉删除的元素
    - 缺点：高复杂度
- Rehash: 把全部元素放进一个新的hash table，相同大小或者更大
    - 优点：把最常用的元素放在home position
    - 缺点：平均搜索路径变长

### Types of Hashing
只有链表是Open hashing, 其他都是Closed