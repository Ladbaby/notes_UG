# Memory Management

memory hierarchy
: 略

memory manager
: the part of the OS that manages (part of) the memory hierarchy


## 3.1 No Memory Abstraction

最简单的三种形式的内存管理。程序执行的指令看到的直接就是物理地址

<img src="./image/2022-10-17-15-21-22.png" width=90%>

这仨都没法做到同时跑不同的程序，因为对同一块内存写入的话会打架

### 3.1.1 Running Multiple Programs Without a Memory Abstraction

然而，确实是有方法能做到同时跑多个程序的。

先不考虑swapping，除此之外的方法是 **fixed partitions**

<img src="./image/2022-10-18-15-05-22.png" width=80%>

每个 partition 之间是互不干扰的，所以可以实现并行

只不过会比较难决定每个partition要多大

## 3.2 A Memory Abstraction: Address Spaces

直接暴露内存地址给进程有很多缺点
- 可能无意间直接修改到OS所在的内存位置，导致系统崩溃
- 难以实现多个程序同时运行

这都说明做抽象是有必要的

### 3.2.1 The Notion of an Address Space

address space
: the set of addresses that a process can use to address memory

每个进程都有自已独立的address space，除非他想和其他进程共享

### 3.2.2 Swapping

两种方法用来防止内存爆炸：
- swapping

    : bringing in each process ==in its entirety==, running it for a while, then putting it back on the disk.
- virtual memory

    :  allows programs to run even when they are only ==partially in main memory==.

这一节学习swapping，3.3节学习virtual memory

---

<img src="./image/2022-10-18-15-17-41.png" width=80%>

基本概念都学过

当swapping导致了内存里出现很多空洞的时候，可以用**memory compaction**来移动所有process下来

### 3.2.3 Managing Free Memory

two ways to keep track of memory usage:
- **bitmaps**
- **free lists**

#### 3.2.3.1 Memory Management with Bitmaps

> memory is divided into allocation units (of equal size) as small as a few words and as large as several kilobytes. Corresponding to each allocation unit is a bit in the bitmap:
> - $0$ if the unit is free
> - $1$ if it is occupied

<img src="./image/2022-10-18-15-22-59.png" width=90%>

图中 (b) 就是bitmap，不难看出是把内存横向展开的结构给8个8个叠了起来

缺点是，当你需要把$k$-unit 的process给塞进内存的时候，memory manager就必须在bitmap里面找到$k$个连续的0，而这是非常花时间的

#### 3.2.3.2 Memory Management with Linked Lists

上图中，(c) 就是linked list的做法，每个item的四个位置分别放着：
- hole (H) or process (P)
- the address at which it starts
- the length
- a pointer to the next item

!!! note
    原来 hole 的位置也会记录吗

假如一个process执行结束了，那这个linked list要怎么更新呢？

<img src="./image/2022-10-18-15-36-26.png" width=70%>

上图展示了四种process $X$要结束的时候，邻居的类型

---

那假如我们要创建一个process (或者process从disk被swap回来了)，也就是要找个hole把process塞进去，有如下的几种算法：
- **First fit**

    scans along the list of segments until it finds a hole that is big enough.

    找第一个足够大的洞
    
    process也不会直接占满整个洞，没用到的地方还是算作hole的
- **Next fit**

    searches from the place where it left off last time for a hole that fits
- **Best fit**

    searches the entire list and takes the smallest hole that fits
- **Worst fit**

    searches the largest hole that fits

## 3.3 Virtual Memory

program被分割成很多的pages。然而，并不是所有的page都必须同时存在于内存当中。只有当程序执行到需要的时候，再去disk里找

### 3.3.1 Paging

virtual addresses
: program-generated addresses

比如 MOV REG,1000 这种指令中的地址

MMU (Memory Management Unit)
: maps the virtual addresses onto the physical memory addresses

<img src="./image/2022-10-18-15-54-19.png" width=80%>

page frames
: The virtual address space consists of fixed-size units called pages. The corresponding units in the physical memory are called **page frames**.

<img src="./image/2022-10-18-18-59-36.png" width=90%>

可以看到，virtual address space 的大小是远大于physical memory address的。这也就意味着，有些virtual address并没有实际对应的物理内存地址

present/absent bit
: keeps track of which pages are physically present in memory

那假如程序指向了这些不存在对应物理内存地址的virtual address咋办？

page fault
: The MMU causes the CPU to trap to the OS. This trap is called a **page fault**

根据计组学过的知识，OS会把需要的东西swap进来，这么做也会改变page table

### 3.3.2 Page Tables

> map virtual pages into page frames

回忆一下，virtual address的构成是：
- virtual page number (high-order bits)
- offset within the page frame (lowe-order bits)

一般来说，每个process都会有自己的page table

#### 3.3.2.1 Structure of a Page Table Entry

<img src="./image/2022-10-18-19-21-56.png" width=80%>

可以看到包含如下field:
- **Page frame number**

    map the frame number
- **Present/absent bit**

    1/0 indicates valid/invalid entry
- **Protection bit**

    what kinds of access are permitted.
- **Modified**

    set when modified and writing to the disk occur
- **Referenced**

    Set when page is referenced (help decide which page to evict)
- **Caching disabled**

    used to keep data that logically belongs on the disk in memory to  improve performance

总长一般是32 bits

### 3.3.3 Speeding Up Paging

two major issues:
- The mapping from virtual address to physical address must be ==fast==
- If the virtual address space is large, the page table will be ==large==

#### 3.3.3.1 Translation Lookaside Buffers (TLB)

感觉就是个field稍有不用的只存几个entry的小page table

计算机的设计者也知道，假如一天到晚用paging的话，内存引用数量的增加是会影响性能的

然而他们发现一个现象：大部分程序倾向于只对极少数的page多次访问

那解决方法也很简单粗暴：

Translation Lookaside Buffer (TLB)
: equip computers with a small hardware device for mapping virtual addresses to physical addresses without going through the page table. Also called **associative memory**

把常用的page装进TLB里就结了

<img src="./image/2022-10-18-19-42-32.png" width=80%>

上图中TLB包含的field有：
- **Valid**

    whether the entry is valid (i.e., in use) or not
- **Virtual page**
- **Modified**

    the bit is set when the page is modified
- **Protection**
- **Page frame**

可以看到大部分field都是同样存在于page table之中的，==除了virtual page==

mapping 的时候大概就是这意思：

<img src="./image/2022-10-18-19-48-50.png" width=80%>

### 3.3.4 Page Tables for Large Memories

#### 3.3.4.1 Multilevel Page Tables

<img src="./image/2022-10-18-19-18-28.png" width=80%>

你懂的

希望不要考些计算地址有多少个bit的题目

#### 3.3.4.2 Inverted Page Tables

传统的做法里，每个process都有一个page table，而每个table又有超多entry，这么一来table占据的空间就显得非常大

仔细想想，根本原因是每个entry都是virtual address到physical address的映射，而virtual address space是比physical address space大很多的

那么，假如我反过来记录呢？==记录的是physical address到virtual address的映射的话，table的大小就能大幅度减小==

然而，虽然存储空间减少了，但是作为一个process，它手上有的只是virtual address，原本的映射方式可以让他们直接hash，现在这样映射的话，就==只能遍历整个inverted page table==，可想而知速度变慢

## 3.4 Page Replacement Algorithms

### 3.4.1 Optimal

理论最优但是不可能实现

> Replace the page which will be referenced at the farthest point

一听就很离谱

### 3.4.2 Not Recently Used

需要知道点前置知识

each page have two *status bits*:
- $R$

    set to 1 whenever the page is referenced (read or written)
- $M$

    set to 1 when the page is written to (i.e., modified)

最初的时候，两位都会被设置成0

!!! note
    $R$ bit 会周期性地被清零（每个时钟周期），而$M$ bit 不会

当 page fault 发生之后，我们可以根据$R$和$M$将page分成四类：
- **Class 0**

    not referenced, not modified
- **Class 1**

    not referenced, modified
- **Class 2**

    referenced, not modified
- **Class 3**

    referenced, modified

搁着排列组合

终于来看看我们的算法是要移除哪个了：

NRU (Not Recently Used)
: removes a page at random from the ==lowest-numbered nonempty== class

可以看出class 1在这里被移除的优先级比class 2高

### 3.4.3 First-In, First-Out (FIFO)

> The operating system maintains a list of all pages currently in memory, with the most recent arrival at the tail and the least recent arrival at the head. On a page fault, the page at the head is removed and the new page added to the tail of the list.

顾名思义的做法

虽然很容易实现，但是万一最老的page是最常访问的就很不好

### 3.4.4 Second-Chance

我们可以对FIFO稍作修改，避免扔掉经常被访问的page：

> Inspect the ==$R$ bit== of the oldest page. If it is 0, the page is both old and unused, so it is replaced immediately. If the R bit is 1, the ==bit is cleared==, the page is ==put onto the end of the list== of pages, and its ==load time is updated== as though it had just arrived in memory

效果如下图所示：

<img src="./image/2022-10-24-14-34-46.png" width=90%>

### 3.4.5 Clock

虽然上面second-chance的做法看似很合理，但是效率还是不够高，因为会经常需要把page重新插入

更好的做法是直接把列表围成一个圆圈，有一个时针指向最老的page：

<img src="./image/2022-10-24-14-37-48.png" width=90%>

算法的过程如上图文字所描述

### 3.4.6 Least Recently Used (LRU)

LRU (Least Recently Used)
: throw out the page that has been unused for the longest time

---

尽管理论上来说可行，但是实现起来其实没那么理想

考虑软件上如何实现。我们需要维护一个所有page的链表，其中最近使用的page放在头部，最远使用的page放在尾部

每次发生memory reference的时候，理论上都需要更新这个链表。而在链表中查询、删除、移动到前面这样的操作其实是非常花时间的

---

考虑硬件上如何实现。我们需要一个 64-bit 的counter, $C$。它会在每个instruction之后自动加一

我们还需要每个table都必须包含一个足够大的field来装这个counter的值。每当发生memory reference，$C$的值就会存到对应的page table里

当发生了page fault的时候，OS就看一看这堆page table里谁的值最小，最小值的就是LRU

---

ppt上还介绍了一种书上没有的奇怪方法

维护一个$n\times n$的矩阵 ($n$ page frames)

当page frame $K$被访问的时候：
- Set row $K$ to all 1s
- Set column $K$ to all 0s

而拥有最小值的那一行就是LRU

<img src="./image/2022-10-25-16-23-22.png" width=80%>

很怪，不懂这是什么操作

### 3.4.7 Simulating LRU in Software

虽然说前面的方法理论可行，但是基本就没几个机器真的有这样的硬件。我们需要一个软件上的解决方法来近似实现LRU

NFU (Not Frequently Used)
: It requires a ==software counter== associated with each page, initially zero. At each ==clock interrupt==, the operating system scans all the pages in memory. For each page, ==the $R$ bit (referenced bit), which is 0 or 1, is added to the counter==

所以，我们每次会选择counter大小最小的page来replace

---

但是这有个问题：假如说一开始的某个指令，它执行的时间相对较长，而在后续的时间里又用不到，那么在后续的时间里，它将永远比其它指令的counter更大，而实际上用不着 (归功于记性太好了)

所幸我们可以用修改后的**aging**算法来避免这个问题，改动包括两点：
- the counters are each shifted right 1 bit before the $R$ bit is added in
- the $R$ bit is added to the leftmost rather than the rightmost bit

对应的就是如图所示的过程：

<img src="./image/2022-10-25-16-16-51.png" width=90%>

而page fault发生的时候，还是选择counter最小的那个

其实就是变成了==记录$R$ bit的变化历史==，数值越小正好对应越早被访问

### 3.4.8 Working Set

在没有做优化的情况下，当我们需要某个page的时候，才会发生page fault把他们弄进来。这叫做**demand paging**

需要的时候才加载其实就有点晚了，我们来看看怎么优化

locality of reference
: during any phase of execution, the process references only a relatively ==small fraction== of its pages

current virtual time
: the amount of CPU time a process has actually used since it started is often called its **current virtual time**

working set
: The set of pages that a process has referenced during the past $\tau$ seconds of *virtual time*

也就是说，其实*working set*是我们最需要关心的一部分page，而这些page一般只占到所有可能会用到pages的一小部分


thrashing
: A program causing page faults every few instructions

我们肯定是要尽量避免thrashing，所以有了**working set model**

working set model
:  paging systems try to keep track of each process’ working set and make sure that it is in memory ==before== letting the process run

这种预加载的行为也叫做**prepaging**

<img src="./image/2022-10-24-15-03-54.png" width=80%>

---

基于working set的思想，我们可以用如下的置换算法：

<img src="./image/2022-10-25-16-38-30.png" width=80%>

图中的文字大概描述了算法的过程。假如恰好所有的page经过一轮扫描之后都存活下来的话，那就移除掉$R==0$里virtual time最小的那个；假如又恰好全都是$R==1$的话，那么就只能随便移除一个了

### 3.4.9 WSClock

working set实际性能并不好，所以有了这个改进算法

ppt上似乎没有详细介绍这个

### 3.4.10 Summary of Page Replacement Algorithms

<img src="./image/2022-10-24-15-07-45.png" width=90%>

## 3.? Modeling Page Replacement Algorithms[^1]

[^1]:[Belady's Anomaly in Page Replacement Algorithms - GeeksforGeeks..](https://www.geeksforgeeks.org/beladys-anomaly-in-page-replacement-algorithms/)

书上没有

Bélády’s anomaly
: the phenomenon where increasing the number of page frames results in an increase in the number of page faults

frame越多会导致page fault也会随之增多，听着就需要避免

我们来看看啥算法可以避免Belady's anomaly

stack-based algorithm
: is one for which it can be shown that the set of pages in memory for $N$ frames is always a ==subset== of the set of pages that would be in memory with $N + 1$ frames

假如增大frame的个数，起码我们可以保证现有的page fault的个数不会增大

!!! note
    Optimal 和 LRU 都是属于stack-based的，而FIFO的抉择因为和frame的个数相关，所以并不属于stack-based，也就会受Belady's anomaly影响

至于为啥可以看链接

## 3.5 Design Issues For Paging Systems

### 3.5.1 Local versus Global Allocation Policies

- **Global**
  
    among all runnable processes
- **Local**

    within a single process

就是说执行之前学过的那么多replacement的算法的视野范围到底是多大

e.g.

<img src="./image/2022-10-24-20-06-17.png" width=80%>

假如A发生了page fault：
- **Global**

    所有进程里B3的年龄最小，所以置换
- **Local**

    A进程里A6最小

!!! note
    age不是人的年龄，是他们的出生日期，所以选最小的

---

PFF (Page Fault Frequency) algorithm
: It tells when to increase or decrease a process’ page allocation but says nothing about which page to replace on a fault. It just ==controls the size of the allocation set==.

<img src="./image/2022-10-24-20-22-23.png" width=80%>

Global algorithm就是用来控制PFF在一个合理的区间内（比如图中的A, B之间）

### 3.5.3 Page Size

internal fragmentation
: On the average, half of the final page will be empty. The extra space in that page is wasted

假如我们使用比较小的page size的话：
- **Advantages**

    less *internal fragmentation*

- **Disadvantages**

    a program will need more pages, thus larger page table

---

现在来计算一下一个 process 的overhead：

- **average process size**: $s$ bytes
- **page size**: $p$ bytes
- **size of each page entry**: $e$ bytes

$$
\text{overhead}=se/p+p/2
$$

其中$se/p$是page table占用的大小 (因为 $s/p$ 是一个 process 占用多少个 page)，$p/2$是internal fragmentation

对$p$求一阶导数后，我们可以得到最优解是：

$$
p=\sqrt{2se}
$$

### 3.5.4 Separate Instruction and Data Spaces

以前，电脑只有一个address space来同时存放program和data。后面就发现同时塞这俩东西还是有点太小了

<img src="./image/2022-10-25-17-16-05.png" width=90%>

这还不简单，直接拆成两个address space不就得了，分别叫做**I-space**和**D-space**

### 3.5.5 Shared Pages

多个不同的用户同时用同一个Program也是很正常的事情，所以干脆共用一个I-space，分别存放D-space：

<img src="./image/2022-10-25-17-19-25.png" width=70%>

### 3.5.8 Cleaning Policy

为了保证有足够的free page frame可供使用，paging system通常有一个后台进程：

paging daemon
: sleeps most of the time but is awakened periodically to inspect the state of memory. If ==too few page frames are free==, it begins selecting pages to ==evict== using some page replacement algorithm

就是提前驱赶，提前留出了空间比需要空间的时候再要要更加高效

## 3.6 Implementation Issues

### 3.6.2 Page Fault Handling

<img src="./image/2022-10-25-17-31-29.png" width=90%>

### 3.6.4 Locking Pages in Memory

虽然之前都没有提到过I/O，但是其实virtual memory和I/O是息息相关的

比如某个process正在等待I/O写入到内存的buffer里，而这个时候另一个process想要干点事情而发生了page fault，那么一个global的算法就有可能把这个buffer置换出去

解决方法也很简单，就是把那块page给锁起来：
> Locking a page is often called **pinning** it in memory

### 3.6.5 Backing Store

<img src="./image/2022-10-25-17-39-36.png" width=%>

一一映射和多花一个disk map的空间来记录disk位置的区别

## 3.7 Segmentation

之前讲过的virtual memory都是one-dimensional的，因为virtual address space只有一个

假如一个编译器进程需要很多不同的table的话，他们就只能一个挨着一个的接在一起了：

<img src="./image/2022-10-25-19-53-38.png" width=80%>

显然这样做并不灵活。假如我们能够让他们分别使用不同的virtual address space的话，会好很多

---

这就需要简单粗暴的解决方法了：

segments
: provide the machine with many completely ==independent address spaces==

这样地址不够用的概率就小得多

segmented (two-dimensional) memory 需要两部分地址：
- segment number
- address within the segment

<img src="./image/2022-10-25-20-01-14.png" width=90%>

**advantages**:
- simplify the handling of data structures that are growing or shrinking
- facilitates sharing procedures or data between several processes

    process默认无法共享资源，这里可以变相实现

    比如说共享的动态链接库



## 3.? 习题

<img src="./image/2022-10-18-20-17-47.png" width=70%>

$$
2^{15}=16\times 2048\\
8*2048=16\text{KB}
$$

---

<img src="./image/2022-10-18-20-20-42.png" width=70%>

？居然不是 B。ppt c9 P23确实提到过这种东西，但是书上似乎完全没有？

---

<img src="./image/2022-10-18-20-22-11.png" width=70%>

---

<img src="./image/2022-10-18-20-22-50.png" width=70%>

反正肯定不是连续，那样分配太不灵活了

---

<img src="./image/2022-10-24-19-36-13.png" width=70%>

注意关键在于 B，代表 byte！所以意思是一个 page 里面有 1024 项

由于 virtual address space 包含了：
$$
2^3\times 2^{10}=2^{13}
$$
个行，所以需要 13 位

同理，physical memory 包含了：
$$
2^5\times 2^{10}=2^{15}
$$
个行，所以是 15 位

---

<img src="./image/2022-10-24-19-37-08.png" width=70%>

---

<img src="./image/2022-10-24-19-38-02.png" width=70%>

---

<img src="./image/2022-10-25-16-41-50.png" width=70%>

二分的时候压根不知道是大于还是小于？

---

<img src="./image/2022-10-24-19-41-16.png" width=70%>

其实可以偷懒，因为分配4个block的时候，page fault rate肯定更小，所以只有C符合

!!! note
    在内存还是空的时候，加载的头几个，也是算 page fault 的！

---

<img src="./image/2022-10-24-19-44-36.png" width=70%>

随便想想就知道了

---

<img src="./image/2022-10-25-20-09-48.png" width=70%>

连续的内存占用减小了，但是总的占用增大？

---

<img src="./image/2022-10-25-20-10-14.png" width=70%>

page fault 发生的频繁，归功于 page replacement algorithm 太菜

---

<img src="./image/2022-10-25-20-10-43.png" width=49%>

<img src="./image/2022-10-25-20-10-56.png" width=49%>

只要注意它说了page table在memory里面，而且TLB的访问忽略时间就行

---

<img src="./image/2022-10-25-20-12-57.png" width=70%>

因为 segmentation 把 address space 分成了好几个，所以是多维的。普通的 paging 就只有一个 space，就是一维的

---

<img src="./image/2022-10-25-20-13-20.png" width=70%>

fixed partition 这种分法本来就要求一个 job 必须存在于一个 partition 里，自然是连续的

---

<img src="./image/2022-10-25-20-23-04.png" width=70%>

segmentation 和其他几个的性质都不一样，它只管把 address space 进行分割的事情，压根不管怎么给每个 process 分配内存

---

<img src="./image/2022-10-25-20-23-29.png" width=70%>

？奇葩

C 肯定是可以的，但 D 到底咋不行，难道是那种无聊的文字游戏？

---

<img src="./image/2022-11-08-10-56-07.png" width=70%>

---

<img src="./image/2022-11-08-10-57-44.png" width=70%>

原来梦有多大就有多大，除非地址表示不了

---

<img src="./image/2022-11-08-11-05-35.png" width=70%>

FIFO 确实受 Belady's anomaly 的影响，但是不代表一定会增加？？？

---

<img src="./image/2022-11-08-11-12-09.png" width=%>

A:
$$
\frac{k\times 1+n}{k}=1+\frac{n}{k}
$$

每个instruction需要花费的时间（以$k$为周期分摊）

---

<img src="./image/2022-11-08-11-18-56.png" width=%>

A:

假设不处理page fault的情况下需要的时间是$A$的话：
$$
A+15000\times 2\text{ms}=60\text{s}
$$
得到$A=30\text{s}$

所以当可用内存翻倍的时候：
$$
30+0.5\times15000\times 2\text{ms}=30+15=45\text{s}
$$

!!! note
    关于为什么memory size翻倍之后，page fault占用的时间减半了：题目的意思是当内存翻倍之后，两个连续的page fault之间的时间间隔同时也翻倍了，意思就是说宏观来看，会遇到的page fault的个数也减半了

---

<img src="./image/2022-11-08-11-31-11.png" width=80%>

A:

非常凑巧的是，数组的每一行都是正好塞满一个page

program 1:

每个page都会在$i$的值变化的时候（要初始化新的行的时候）被叫一次，所以有100个page fault

program 2:

这位更是重量级

每个$j$，都需要100个page fault来访问所有的行，所以总的page fault数量是$200\times 100=20000$

---

<img src="./image/2022-11-08-11-50-05.png" width=80%>

假设page fault rate是$p$:

$$
(1-p)\times 1\mu s + p\times (0.7\cdot 20\text{ms}+0.3\cdot 8\text{ms}+1\mu s)\le 2\mu s
$$

解得$p\le \frac{1}{16400}=0.00006$

---

<img src="./image/2022-11-08-21-33-35.png" width=%>

其实题目漏了一个默认的假设：每个register包含一个word

A:

除了32个CPU register之外，还有program counter和PSW两个，所以一共是34个

所以需要满足：

$$
1\text{s}/ (34\times 2\times 5\text{ns})
$$

至于为什么有个2，我觉得是34个register自身要被读取一次，而各自内部存储的东西也要被读取一次？

!!! note
    乘2的原因并不确定，需要再次确认
