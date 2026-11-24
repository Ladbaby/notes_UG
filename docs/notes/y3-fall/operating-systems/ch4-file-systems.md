# File Systems

对于长期信息存储，我们有三个重要的需求：
- It must be possible to store a very large amount of information
- The information must survive the termination of the process using it
- Multiple processes must be able to access the information at once

为了满足这些有关信息存储的需求，我们在存储文件的时候需要一个新的信息单位：

Files
: **Files** are logical units of information created by processes

## 4.1 Files

这一小节里，我们将从使用者的角度来看file的性质和使用方法等

### 4.1.1 File Naming

常识

<img src="./image/2022-11-15-15-33-33.png" width=80%>

### 4.1.2 File Structure

<img src="./image/2022-11-15-15-39-34.png" width=%>

- (a)

    Windows & Unix
- (b)

    以前很常见
- (c)

    large mainframe computers

### 4.1.3 File Types

文件内部的具体结构可能不一样：

<img src="./image/2022-11-15-15-45-10.png" width=90%>

### 4.1.4 File Access

- **Sequential access**
- **Random access**

### 4.1.5 File Attributes

attributes/metadata
: OS associate other information with each file

有可能存放于FCB (**File Control Block**)里

<img src="./image/2022-11-15-15-52-12.png" width=80%>

### 4.1.6 File Operations

- Create
- Delete
- Open
- Close
- Read
- Write
- Append
- Seek
- Get attributes
- Set attribute
- Rename

### 4.1.7 An Example Program Using File-System Calls

<img src="./image/2022-11-15-15-55-34.png" width=%>

## 4.2 Directories

### 4.2.1 Single-Level Directory Systems

<img src="./image/2022-11-15-15-59-30.png" width=80%>

树的深度只有一层的奇葩玩意

### 4.2.2 Hierarchical Directory Systems

<img src="./image/2022-11-15-16-00-44.png" width=80%>

### 4.2.3 Path Names

绝对路径和相对路径的知识，你懂的

### 4.2.4 Directory Operations

- Create
- Delete
- Opendir
- Closedir
- Readdir
- Rename
- Link
- Unlink

## 4.3 File-System Implementation

这一小节将从开发者的视角出发

### 4.3.1 File-System Layout

MBR (Master Boot Record)
: Sector 0 of the disk is called the **MBR** and is used to boot the computer

MBR后面会紧跟着：

**partition table**
: gives the starting and ending addresses of each partition

> One of the partitions in the table is marked as active. When the computer is booted, the BIOS reads in and executes the MBR
>
> The first thing the MBR program does is locate the active partition, read in its first block, which is called the **boot block**

<img src="./image/2022-11-15-16-14-20.png" width=%>

在boot block之后的顺序就不一定一样了，这里介绍的是其中一种
- **Superblock**

    contains the key parameters about the file system
- **Free space mgmt (management)**

    free blocks information
- **I-nodes**

    tells all about the file
- **Root dir**
- **Files and directories**

### 4.3.2 Implementation Files

#### 4.3.2.1 Contiguous Allocation

<img src="./image/2022-11-15-16-26-50.png" width=%>

看着就很没用

- **Advantages**

    - Simple to implement
    - Read performance is excellent
- **Disadvantages**

    - Disk fragmentation
    - The maximum file size must be known when file is created

e.g.: CD-ROMs, DVDs

!!! warning 
    这种做法的随机读写能力反而很强！不要觉得是按顺序存储的就被绕进去了


#### 4.3.2.2 Linked-List Allocation

顾名思义

<img src="./image/2022-11-15-16-48-26.png" width=80%>

**Disadvantages**
- slow random access speed
- the amount of data in a block is not a power of 2

    因为pointer会占据几个byte

#### 4.3.2.3 Linked-List Allocation Using a Table in Memory

既然pointer会碍事，干脆就把所有pointer都放在一个**FAT** (File Allocation Table)里，存放在==memory==中

<img src="./image/2022-11-15-16-57-17.png" width=80%>

**Advantages**
- The entire block is available for data
- Stored in memory, fast

**Disadvantages**
- occupies a large amount of memory

#### 4.3.2.4 I-nodes

i-node (index-node)
: to associate with each file a data structure called an **i-node**, which lists the attributes and disk addresses of the file's blocks

<img src="./image/2022-11-15-17-04-30.png" width=60%>

这图感觉完全不利于理解。。。平时==i-node是完全不需要在memory里的==，只有当对应的文件需要打开的时候，才会被加载进memory (要不然的话相比上一个方法就没有内存上的优势了)

[4.1.5](#415-file-attributes)里提到的file control block有可能就是用i-node实现的

### 4.3.3 Implementing Directories

我们要读取文件的时候，首先当然是要找到directory当中的那一项

该directory entry会包含找到对应disk block的信息，而这个信息根据不同的操作系统，可能为：
- disk address of the entire file (with contiguous allocation)
- the number of the first block (both linked-list schemes)
- the number of the i-node

可以看到就是前一节提到的三种不同实现方式

---

读取文件紧密关联的就是读取对应文件的属性，而这些属性怎么存储起来就是个问题

<img src="./image/2022-11-15-20-08-52.png" width=%>

可以看到第一种做法直接和文件本身存在了同一个目录之下；第二种做法则是使用了i-node，映射到其它位置

---

之前都是假设文件的名字并不长，所以干脆每个名字给了固定的分配空间，这样做其实很浪费空间。怎么样支持较长的文件名字呢？

<img src="./image/2022-11-15-20-16-03.png" width=90%>

肯定都是放弃名字定长，图中给了两种做法：
- **In-line**

    名字可以跨越多行，但是最终都会占据整数个word
- **In a heap**

    名字部分先存个定长的pointer，指向directory里最后部分放置着的heap，里面存放着实际的名字，且不必每个名字都占据整行

---

最后来考虑一下怎么样搜索每个directory
- Linearly

    慢
- Hash table

    faster lookup but more complex administration
- Cache the results of searches

### 4.3.4 Shared Files

不同的用户之间可以共享同一个文件：

<img src="./image/2022-11-19-19-37-07.png" width=60%>

此时文件系统的机构就不是tree了，而是变成了**DAG (Directed Acyclic Graph)**

为了解决协作的问题，有两种方法：
- > disk blocks are not listed in directories, but in a little data structure associated with the file itself. The directories would then point just to the little data structure

    UNIX中就是用i-node实现的这方法

- symbolic linking

    : B links to one of C's files by having the system create a new file, of type LINK, and entering that file in B's directory. The new file contains just the path name of the file to which it is linked. When B reads from the linked file, the operating system sees that file. 

    感觉就是windows的做法

### 4.3.7 Virtual File Systems

操作系统是允许同时使用不同类型的文件系统的，比如windows主系统是NTFS，但是插入的U盘用着上古FAT-16之类的玩意

为了实现这一特性：

virtual file system
: is the software layer in the kernel that provides the file system interface to user space programs

<img src="./image/2022-11-19-19-50-51.png" width=70%>

大概就是在各种文件系统上面再做一层抽象，方便用户程序调用

## 4.4 File-System Management and Optimization

### 4.4.1 Disk-Space Management

和管理内存相似，想要存放一个 $n$ byte 的文件的话，有两种思路：
- $n$ consecutive bytes of disk space

    这种行为肯定是非常不灵活的
- $\lceil n/k \rceil$ blocks of size $k$ bytes each

    正经的做法

#### 4.4.1.1 Block Size

block 的大小选择是个比较难办的事情：
- 假如每个 block 太大

    浪费硬盘空间
- 假如每个 block 太小

    浪费时间，因为一个文件需要的 block 数量太多，必须找个好几次才能全部读完

<img src="./image/2023-01-06-15-14-05.png" width=%>

反正ppt上说，每个 block 一般是512 bytes, 1k (UNIX), or 2k

#### 4.4.1.2 Keeping Track of Free Blocks

选定了每个 block 的大小之后，接下来的问题就是，如何记录空的 block

!!! note
    下面的讨论都取 block 的大小为 1KB

两种常用的方法如下：

<img src="./image/2023-01-06-15-18-05.png" width=%>

##### 4.4.1.2.1 linked list

假设有1KB的空间存储链表的一项（也就是一个block对应的，图中的一列）的话，就可以存储1024*8/32-1=255个子项（最后一个留给next pointer）

这东西存在一些问题，可能导致不必要的 I/O 操作：

<img src="./image/2023-01-06-22-39-46.png" width=%>

比如说，此时内存中存放着free list的一项，而这一项实际上只有两个空位了（图(a)）。假如有一个临时文件，恰好需要写三个block，那么正好就会需要free list的下一项被读进内存（图(b)）

那假如这个临时文件突然又需要读取呢？这时候图(a)中的那一项又得被重新读进来。总之，恰好处于边缘的时候，会导致很多不必要的IO

图(c)是一种解决方法：
> The idea here is to keep most of the pointer blocks ==on disk full== (to minimize disk usage), but keep the one ==in memory about half full==

##### 4.4.1.2.2 bitmap

有 $n$ 个block就需要 $n$ 个 bit 来记录

1 表示有空，0表示没空

!!! note
    由于 bitmap 中，每个 block 只需要 1-bit 来记录，对比 linked list 里的 32-bit 来说，节省了不少的空间

    只有当硬盘接近全满的时候，linked list 才会比 bitmap 高效

### 4.4.2 File-System Backups

备份一般用于应对以下两种情况：
- Recover from disaster

    比如硬盘摔坏了
- Recover from stupidity

    比如你删错物件了

备份的时候一般会考虑以下问题：
- should the entire file system be backed up or only part of it?
- it is wasteful to back up files that have not changed since the previous backup, which leads to the idea of **incremental dumps**
- it may be desirable to compress the data before writing them to tape.
- it is difficult to perform a backup on an active file system
- security problem of backups

至于怎么样把硬盘里的东西转存到备份的硬盘里：
- physical dump

    : starts at block 0 of the disk, writes all the disk blocks onto the output disk in order, and stops when it has copied the last one

    - Advantages: simple and fast
    - Disadvantages: backup everything
- logical dump

    : starts at one or more specified directories and recursively dumps all files and directories found there that have changed since some given base date

    说人话就是可以随便指定备份哪个目录，而且可以增量备份

---

下面来详细介绍一种属于 logical dump 的备份算法

现有如下的文件系统：

<img src="./image/2023-01-07-20-17-15.png" width=%>

首先要说明的是，在备份一个被修改的文件的时候，==这个文件的路径也会备份==，这样才能恢复

> The dump algorithm maintains a ==bitmap== indexed by i-node number with several bits per i-node. Bits will be set and cleared in this map as the algorithm proceeds

<img src="./image/2023-01-07-20-21-50.png" width=%>

如上图，算法存在四个阶段：
- **Phase 1**

    > For each modified file, its i-node is marked in the bitmap. 
    > 
    > Each directory is also marked (whether or not it has been modified) and then recursively inspected

    标记任何的目录，以及修改过的文件
- **Phase 2**

    > conceptually recursively walks the tree again, unmarking any directories that have no modified files or directories in them or under them

    实际上第一第二步完全可以合起来
- **Phase 3**

    > scanning the i-nodes in numerical order and dumping all the directories that are marked for dumping

    就是备份 Phase 2 里面的所有目录
- **Phase 4**

    就是备份 Phase 2 里面的所有文件

### 4.4.3 File-System Consistency

假如文件写到一半的时候系统崩溃了的话，那么文件系统就会陷入不一致的状态

操作系统一般都有检查文件系统一致性的工具：
- UNIX: *fsck*
- Windows: *sfc*

有两种 consistency check：

#### 4.4.3.1 Block Consistency

!!! note
    核心思想是：每个 block，要么是处于被某个文件使用的状态，要么是处于空闲状态。假如都不是，那就是发生了 inconsistency

检查步骤如下：
- 先准备两个单元格个数都等于 block 总数的 table：第一个 table 用于记录 block 出现在文件中的次数；第二个 table 用于记录 block 出现在 freelist 中的次数
- 先来填一下第一个 table，看看哪些 block 是被使用的

    > the program reads all the i-nodes and uses the i-nodes to build a list of all blocks used in the files (incrementing file counter as each block is read)
- 再来填一下第二个 table ，看看哪些 block 是空闲的

    > Check free list or bit map to find all blocks not in use (increment free list counter for each block in free list)

可能出现的结果如下：

<img src="./image/2023-01-07-22-15-10.png" width=%>

- **Consistent**

    对于每个 block 来说，要么是被占用的，要么是空闲的，所以要么是第一个 table 里的 entry 为 1，要么是第二个 table 里的 entry 为 1
- **Missing block**

    block 2 在两个 table 里均没有记录

    解决方法：把这个 block 加入到 freelist
- **Duplicate block in free list**

    第二个 table 里居然有出现两次的 block

    解决方法：重新构建 freelist
- **Duplicate data block**

    第一个 table 里居然有出现两次的 block

    解决方法：把其中一个 block 复制到另一个空的 block 里，以将原本重复的两个 block 作出区分

#### 4.4.3.2 File Consistency

同样使用 table，只不过这次 table 记录的是每个 file 的计数，而不是 block

> It starts at the root directory and recursively descends the tree, inspecting each directory in the file system. 
> 
> For every i-node, it increments the counter for that file’s usage count

!!! note
    由于 hard link 的存在，一个文件可能同时出现在不同的目录之下；但 symbolic link 并不被计入到上述的计数中

> When the checker is all done, it has a list, indexed by i-node number, telling how many directories contain each file. 
> 
> It then compares these numbers with the link counts stored in the i-nodes themselves

!!! note
    还记得 i-node 会存自己代表的这个文件被 hard link 了多少次吗

上述检查之后，会有两种异常情况：

- i-node link count > computed value 

    这样即便把所有文件都移除，i-node 也不会归零

    解决方法：把 i-node count 改为 computed value
- i-node link count < computed value

    > The i-node may be freed even when there is another directory points to it. Directory will be pointing to unused i-node

    解决方法：同第一种情况

### 4.4.4 File-System Performance

#### 4.4.4.1 Caching

block cache (buffer cache)
: is a collection of blocks that logically belong on the disk but are being kept in memory for performance reasons

<img src="./image/2023-01-08-17-03-01.png" width=%>

假如 cache 满了，然后需要加载新的 block 进来的话，怎么样确定哪些 block 被替换呢？实际上这就非常像 [paging](ch3-memory-management.md#34-page-replacement-algorithms) 了，所以==所有的 page-replacement algorithms 都可以使用==

---

每过一段时间，所有的 data block 就得被写进 disk （防止系统崩了以后数据全丢了）

不同的操作系统有着不同的实现方法：
- **UNIX**

    > have a system call, `sync`, which forces all the modified blocks out onto the disk immediately

    这个函数会每隔一段时间被调用一次
- **Windows**

    > write every modified block to disk as soon as it was written to the cache

    也叫做 **write-through caches**，写进 cache 后直接再写进 disk

#### 4.4.4.2 Block Read Ahead

Get blocks into the cache before they are needed to increase the hit rate;

Suitable for files that are being read sequentially;

If a file is being randomly accessed, read ahead does not help;

It hurts by tying up disk bandwidth reading in useless blocks and removing potentially useful blocks from the cache

说白了就是预判不一定有用

#### 4.4.4.3 Reducing Disk-Arm Motion

<img src="./image/2023-01-08-17-54-50.png" width=%>

图(a)是传统的i-node摆放方法，图(b)是改良后的，把i-nodes尽量放到各自的cylinder group里，这样就不需要多转一圈找data block

### 4.4.5 Defragmenting Disks 

用久了之后，硬盘上就会有很多空隙。这就需要文件挪一挪，让空闲的空间重新连续

？什么年代了还需要这东西？

## 4.5 Example File Systems

### 4.5.1 The MS-DOS File System

IBM 第一台计算机用的文件系统。。。什么古董玩意

用 32-bit 定长的 directory entry：

<img src="./image/2023-01-08-18-01-22.png" width=%>

后来衍生出了 FAT 文件系统：

<img src="./image/2023-01-08-18-06-04.png" width=%>

比如 FAT-12 用 12-bit 的 pointer，所以可以支持的最大 partition 是 $2^{12}\times 512$ (block size 为 512-byte)

### 4.5.2 The UNIX V7 File System

<img src="./image/2023-01-08-18-09-10.png" width=70%>

<img src="./image/2023-01-08-18-09-42.png" width=%>

<img src="./image/2023-01-08-18-10-10.png" width=%>

## 习题

<img src="./image/2022-11-15-16-39-23.png" width=70%>

你是来搞笑的吧

---

<img src="./image/2022-11-15-16-39-50.png" width=70%>

なるほど

---

<img src="./image/2022-11-15-16-42-11.png" width=70%>

file control block 很多时候是用 i-node 实现的，所以相当于读取了 i-node

---

<img src="./image/2022-11-15-16-42-54.png" width=70%>

B应该是错在 user directory name？C居然是对的

---

<img src="./image/2022-11-15-16-44-11.png" width=70%>

!!! note
    random是对的，不要混淆了sequential access和contiguous allocation！

---

<img src="./image/2022-11-19-19-53-50.png" width=70%>

contiguous 够随机但是不能扩展文件大小；linked list 不够随机但是能够扩展文件大小

---

<img src="./image/2022-11-19-19-55-59.png" width=70%>

鉴于一个文件只和一个 i-node 有关，所以总的 i-node 的数量和单个文件的大小没有任何关系

---

<img src="./image/2022-11-19-22-31-42.png" width=90%>

A:

!!! note
    注意区分pointer所占用的空间（内部节点），和实际存储文件所占的空间（叶节点）

<img src="./image/2022-11-19-22-37-24.png" width=80%>

---

<img src="./image/2022-11-19-22-38-15.png" width=70%>

逆天

---

<img src="./image/2022-11-19-22-39-57.png" width=70%>

A:

<img src="./image/2022-11-19-22-40-11.png" width=%>

？原来加载directory还需要加载进内存里？

---

<img src="./image/2022-11-21-15-47-55.png" width=%>

---

<img src="./image/2023-01-08-10-16-38.png" width=70%>


---

<img src="./image/2023-01-08-10-18-02.png" width=70%>

反正就不负责驱动

---

<img src="./image/2023-01-08-10-23-53.png" width=70%>

"32 bit" 指的是一个 word 的长度。。。

100 \% 32 = 3 余 4

!!! warning
    小心 word index 是 4 不是 3！！！

---

<img src="./image/2023-01-08-10-50-22.png" width=80%>

A:

freelist 需要记录所有空闲的 block 的 disk address，所以需要：$D\times F$ bits

bitmap 需要 $B$ bits

所以需要满足的条件是：
$$
D\times F < B
$$

也就是说，空闲的 block 占所有 block 的比例应该满足：
$$
\frac{F}{B} < \frac{1}{D} = \frac{1}{16}
$$

---

<img src="./image/2023-01-08-10-58-01.png" width=80%>

---

<img src="./image/2023-01-08-11-00-51.png" width=80%>

A:

block 的大小固定为 2KB，而文件固定为 1KB，所以 50\% 的空间会被浪费

由于正常的文件系统里，大部分文件都会大于 2KB，所以一般空间浪费率比这个要小

---

<img src="./image/2023-01-10-19-21-41.png" width=70%>

[参考另一个相似的问题](https://gateoverflow.in/324788/andrew-tanenbaum-os-edition-exercise-question-38-page-no-336)

这题漏了一个条件：==一个== double indirect block 能最大指向多大的文件

首先来算一算，一个block里能装多少个 disk block number：

$$
1\text{KB}\div 4\text{B}=2^{8}
$$

!!! warning
    这里算出来的是 "个" 不是 "byte"

然后算一算，一个 double indirect block 到底指向了多少个 block：

$$
2^{8}\times 2^{8}=2^{16}
$$

由于一个 block 大小是 $1 \text{ KB}$，所以总共占用的空间是：
$$
2^{16}\times 1\text{ KB}=64\text{ MB}
$$

---

<img src="./image/2023-01-10-20-12-48.png" width=70%>

送分题

---

<img src="./image/2023-01-10-20-13-11.png" width=70%>

---

<img src="./image/2023-01-10-20-15-52.png" width=70%>

好像 partition 主要是分盘而不是 I/O

---

<img src="./image/2023-01-10-20-22-41.png" width=80%>

A:

这个奇葩的题。。。因为每个硬盘读取后都必须花 2ms 处理，为了顺序读取，它一圈只能读一个 block。。。真是不敢恭维的效率

处理每一个 block 所需要的时间：

$$
27/9+2=5\text{ms}
$$

处理完后，需要经过多少秒才能读取下一个 block：

$$
27-2=25\text{ms}
$$

所以总时间是：

$$
(25+5)\times 8+5=245\text{ms}
$$

---

<img src="./image/2023-01-11-15-19-07.png" width=80%>

A:

上一个题目的变种，这次来问你怎么样排列最优了

鉴于我们能缩短的就是转到下一个block需要的时间，所以block的顺序就是：
$$
\text{AFBGCHDIE}
$$

所以需要花费的总时间就是：

$$
(3+3)\times 8+(3+2)=53\text{ms}
$$

---

<img src="./image/2023-01-15-17-05-21.png" width=70%>

记录哪些 block 是空闲的
