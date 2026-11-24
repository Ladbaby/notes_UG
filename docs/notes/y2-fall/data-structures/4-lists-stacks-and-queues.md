# 1.Lists

### a.Introduction

### b.Array-based List

* listSize指向的是最后一个有存放元素位置的下一个，应该是空的
* 缺点：需要提前分配内存，会浪费空间

### c.Linked List

* 因为只存了下一个的地址，所以只能从前往后一个个找
* 和arraybase的定义不同，tail是指向最后一个存放元素的位置
* swap的实现非常绕，多琢磨一下
* 进阶技巧：freelist。把暂时不用的内存放在链表头部，要用了再取出来。适合周期性变长缩短的列表

### d.Comparison

* arraybase: 插入和删除$\Theta(n)$，定位$\Theta(1)$
* 链表: 插入和删除$\Theta(1)$，定位$\Theta(n)$

### e.Doubly Linked List

就是多了个previous的指针，在进行各种操作时要记得同时更新前面元素的next指针和**后面元素的previous指针**

# 2.Stacks

* Restricted form of a list
* first in last out（反正就是一个水杯一样）
* notation
    * insert: **push**
    * remove: **pop**
    * the accessible element is called **top**
* 有Array-based和linked两种实现方式(真的会有人用array-based吗)

# 3.Queues

* restricted form of a list
* first in first out（单向流动）
* notation
    * insert: **push**
    * delete: **pop**
    * first element: **front**
    * last element: **back**

array-based的queue有个问题，就是内存会越用越短，这时需要我们假装他的内存是环形的，用求模来实现(真的会有人用array-based吗)

# 4.Dictionary（用作database）

大概说了一下为什么要用书上那种奇怪的KECompare之类的操作，这样是为了让使用者自己来决定怎么写比较函数
