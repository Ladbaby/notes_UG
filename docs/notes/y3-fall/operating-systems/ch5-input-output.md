# Input/Output

## 5.1 Principles of I/O Hardware

不同的人看待I/O设备的方式都不同。在本书中，我们将聚焦于programming I/O devices，而不是设计、制造、维护、里面如何运作

### 5.1.1 I/O Devices

I/O devices can be roughly divided into two categories:
- block devices

    : stores information in fixed-size blocks, each one with its own address

    数据以block为单位传输

    e.g.

    hard disks, blu-ray discs, USB sticks
- character devices

    : delivers or accepts a stream of characters, without regard to any block structure

    e.g.

    printers, network interfaces, mice

当然存在两者都不属于的设备，比如clock

<img src="./image/2022-11-01-22-34-43.png" width=60%>

### 5.1.2 Device Controllers

components of I/O units:
- **mechanical component**

    指的就是设备本身
- **electronic component**

    also called **device controller** or **adapter**

    device controller
    : is a part of a computer system that makes sense of the signals going to, and coming from the CPU

    每个device controller都有一个local buffer和一些register

    一般来说指的是板子上的一个芯片   

    <img src="./image/2022-11-01-22-40-34.png" width=80%>

根据标题来看，显然我们要考虑的就是device controller

### 5.1.3 Memory-Mapped I/O

关于CPU如何和control register以及data buffer通信，有几种解决方案：
- each control register is assigned an **I/O port** number

    也就是说，这时候memory和I/O的address space是不同的
- memory-mapped I/O

    : All the control registers are mapped into the memory space
- hybrid

    data buffer放在memory-mapped里，而control register放在独立的I/O ports里

<img src="./image/2022-11-02-10-13-19.png" width=%>


## 5.2 Principles of I/O Software

[计组里面学过](../../y2-spring/computer-organization/ch7-input-and-output.md)

### 5.2.2 Programmed I/O

见[计组 7.3](../../y2-spring/computer-organization/ch7-input-and-output.md#73-programmed-io)，这里补充具体的操作过程：

<img src="./image/2022-11-02-10-21-34.png" width=%>

<img src="./image/2022-11-02-10-21-21.png" width=%>

### 5.2.3 Interrupt-Driven I/O

见[计组 7.4](../../y2-spring/computer-organization/ch7-input-and-output.md#74-interrupt-driven-io)，这里补充伪代码：

<img src="./image/2022-11-02-10-24-12.png" width=%>

<img src="./image/2022-11-02-10-27-08.png" width=80%>

### 5.2.4 DMA

见[计组 7.5](../../y2-spring/computer-organization/ch7-input-and-output.md#75-direct-memory-access)

<img src="./image/2022-11-02-10-28-08.png" width=%>

<img src="./image/2022-11-02-10-29-53.png" width=%>


## 5.3 I/O Software Layers

<img src="./image/2022-11-02-10-30-30.png" width=%>

!!! warning
    interrupt handler 位于 device driver 的下方！

### 5.3.1 Interrupt Handlers

> Interrupts should be hidden away, deep in the bowels of the OS, so that as little of the OS as possible knows about them.
>
> The best way to hide them is to have the driver starting an I/O operation block until the I/O has completed and the interrupt occurs
>
> When the interrupt happens, the interrupt procedure does whatever it has to in order to handle the interrupt. Then it can unblock the driver that was waiting for it

a series of steps that must be performed in software after the hardware interrupt has completed: 
- Save any registers (including the PSW) that have not already been saved by the interrupt hardware.
- Set up a context for the interrupt-service procedure. Doing this may involve setting up the TLB, MMU and a page table.
- Set up a stack for the interrupt service-procedure.
- Acknowledge the interrupt controller. If there is no centralized interrupt controller, reenable interrupts.
- Copy the registers from where they were saved (possibly some stack) to the process table.
- Run the interrupt-service procedure. It will extract information from the interrupting device controller’s registers.
- Choose which process to run next. If the interrupt has caused some high-priority process that was blocked to become ready, it may be chosen to run now.
- Set up the MMU context for the process to run next. Some TLB setup may also be needed.
- Load the new process’ registers, including its PSW.
- Start running the new process.

### 5.3.2 Device Drivers

<img src="./image/2022-11-02-10-31-24.png" width=70%>

Communications between drivers and device controllers goes over the bus

### 5.3.3 Device-Independent I/O Software

尽管很多I/O function是根据具体的设备而变化的 (device specific)，但是也有很多是 device independent 的：

<img src="./image/2022-11-07-14-28-29.png" width=70%>

> The basic function of the device-independent software is to perform the ==I/O functions that are common to all devices== and to provide a uniform interface to the user-level software

#### 5.3.3.1 Uniform Interfacing for Device Drivers

<img src="./image/2022-11-07-14-31-59.png" width=90%>

#### 5.3.3.2 Buffering

<img src="./image/2022-11-07-14-55-11.png" width=%>

### 5.3.4 User-Space I/O Software

<img src="./image/2022-11-07-14-59-02.png" width=80%>

<img src="./image/2022-11-07-15-00-23.png" width=%>

## 5.4 Disks

### 5.4.1 Disk Hardware

#### 5.4.1.1 Magnetic Disks

<img src="./image/2022-11-07-16-14-45.png" width=70%>

事实上，同一个圆周上的sector的数量并不一定是一样的，比如外圈一般会多一些sector，内圈会少一些

<img src="./image/2022-11-07-16-18-16.png" width=90%>

为了方便OS，硬盘会提供一个virtual geometry

#### 5.4.1.2 RAID (Redundant Array of Independent Disks)

虽然CPU的性能日新月异，但是硬盘的性能其实一直以来提升幅度都非常小。有什么办法可以弥补这个差距吗？parallel I/O可能是个不错的主意

> The fundamental idea behind a RAID is to install ==a box full of disks== next to the computer, typically a large server, replace the disk controller card with a RAID controller

这样从外界看来，RAID看起来就像是一整块大的硬盘

这样还带来的好处是可以支持并行操作：

striping
: Distributing data over multiple drives

RAID存在level 0到level 6六种不同的组成方式（level其实比较有迷惑性，因为其实他们之间并不是层次关系）

<img src="./image/2022-11-09-11-26-40.png" width=70%>


### 5.4.2 Disk Formatting

在硬盘刚制造出来之时，每个sector并不存在一个编号

> Before the disk can be used, each platter must receive a **low-level format** done by software

<img src="./image/2022-11-07-16-25-59.png" width=%>

/priˈæmbl/ 序言

实际上sector之间是存在一点gap的

---

Cylinder skew
: the position of sector 0 on each track is ==offset== from the previous track when the low-level format is laid down

<img src="./image/2022-11-08-10-09-24.png" width=80%>

看起来是个迷惑行为，实际上是出于性能考量，方便在连续读取多个track的数据的时候，能少转一圈：
> Suppose that a request needs 18 sectors starting at sector 0 on the innermost track. Reading the first 16 sectors takes one disk rotation, but a seek is needed to move outward one track to get the 17th sector. ==By the time the head has moved one track, sector 0 has rotated past the head== so an entire rotation is needed until it comes by again

---

众所周知从buffer复制到memory的过程需要一点时间，所以我们可以更改一下sector之间的编号顺序，让他们间隔着出现，也就是 interleaving：

<img src="./image/2022-11-08-10-17-50.png" width=%>

### 5.4.3 Disk Arm Scheduling Algorithms

The time required to read or write a disk block is determined by three factors:
- **Seek time**

    the time to move the arm to the proper cylinder
- **Rotational delay**

    how long for the proper sector
- **Actual data transfer time**

实际上，seek time是最主要的时间消耗

于是乎我们来看看有哪些策略：

---

假如我们最开始在cylinder11，现在需要访问1, 36, 16, 34, 9, 12

FCFS (First-Come, First-Served)
: the disk driver accepts requests one at a time and carries them out in that order

按照先来先搞的原则的话，总共需要移动：

$$
10+35+20+18+25+3=111
$$

SSF (Shortest Seek First)
: handle the closest request next

<img src="./image/2022-11-08-10-45-59.png" width=%>

优先找离自己最近的，所以访问的顺序变成了12, 9, 16, 1, 34, 36

对应的cost是：
$$
1+3+7+15+33+2=61
$$

elevator algorithm
: keep moving in the same direction until there are no more outstanding requests in that direction, then they switch directions

> 这就是等电梯的时候经常按了按钮却忽视我的原因？

<img src="./image/2022-11-08-10-52-18.png" width=%>

假设arm最开始往右走，那么顺序就是12, 16, 34, 36, 9, 1

对应的cost是：
$$
1+4+18+2+27+8=60
$$

### 5.4.4 Error Handling

当某些扇区存在问题的时候，我们有两种做法应对：

- Substituting a spare for the bad sector
- Shifting all the sectors to bypass the bad one

<img src="./image/2022-11-09-11-30-44.png" width=%>

### 5.4.5 Stable Storage

尽管RAID能够在个别sector发生错误甚至一个硬盘错误的情况下保住数据，但是他们没法避免写入时发生错误等问题

这就需要我们有个更好的方案来保证数据的稳定性

stable storage
: The goal is to keep the disk consistent at all costs

> *Stable storage* uses ==a pair of identical disks== with the corresponding blocks working together to form one error-free block

也就是说，没发生错误的情况下，两个盘的内容是一样的。为了实现这个目标，我们定义如下操作：
- **Stable writes**

    > first writing the block on drive 1, then ==reading it back== to verify that it was written correctly

    假如发现并没有写成功，那么就接着重复$n$次

    假如$n$次后还是失败，那么就换一个位置写，直到成功

    drive 2之后做同样的事情
- **Stable reads**

    > first reads the block from drive 1. If this yields an ==incorrect ECC== (Error Correcting Code), the read is tried again, up to $n$ times

    假如$n$次后还是有问题就换drive 2

别的ppt没讲，略

## 5.5 Clocks

also called **timers**

我们依然是先看看硬件再看看软件

### 5.5.1 Clock Hardware

旧的方式就不讲了，来看看现在用的

这玩意由三部分组成：
- **crystal oscillator**

    generate a periodic signal in the range of several hundred MHz
- **counter**
- **holding register**

<img src="./image/2022-11-09-11-56-02.png" width=90%>

Programmable clocks typically have several modes of operation:
- **one-shot mode**

    > when the clock is started, it copies the value of the holding register into the counter and then decrements the counter at each pulse from the crystal. When the counter gets to zero, it causes an ==interrupt== and stops until it is explicitly started again by the software
- **square-wave mode**

    > after getting to zero and causing the interrupt, the holding register is automatically copied into the counter, and the whole process is ==repeated again indefinitely==

    These periodic interrupts are called **clock ticks**

### 5.5.2 Clock Software

clock hardware产生的周期性信号由clock driver接受，而它一般会有一下职责：
- Maintaining the time of day.
- Preventing processes from running too long.
- Handling the alarm system calls (e.g., ACK).
- Others.

<img src="./image/2022-11-09-17-02-30.png" width=%>

To satisfy multiple timing requests, the OS needs to simulate multiple virtual timers with a single clock:

<img src="./image/2022-11-09-17-24-36.png" width=80%>

## 5.6 User Interfaces: Keyboard, Mouse, Monitor

### 5.6.1 Input Software

#### 5.6.1.1 Keyboard Software

An ==interrupt== is generated when a key is pressed or released

The key board driver extracts the **scan code** from the I/O port, and translates it to ASCII code

---

假设现在用户想输入"date"，然而一开始打成了"dste"，于是有了如下键盘输入：

$$
\text{d s t e }\leftarrow\leftarrow\leftarrow\text{ a t e CR}
$$

!!! note
    CR是carriage return的缩写

这时候其实程序这边，只希望知道最后的输出是date，它并不关心中间做了什么操作

所以就有两种输出的模式：
- **canonical mode**

    输出的是最终的结果
- **noncanonical mode**

    输出的原始的键盘输入

#### 5.6.1.2 Mouse Software

说是鼠标原本有两种的：
- Mouse with a rubber ball

    ？？？什么古董玩意
- Optical mouse 

When a mouse has moved a certain minimum distance (called **mickey**) or a button is depressed or released, a message is sent to the computer: ($\Delta x$, $\Delta y$, status of buttons)

一般而言这个信号会需要3 bytes

### 5.6.2 Output Software

#### 5.6.2.1 Text Windows

程序员一般面对的玩意

escape sequence
: most output drivers support a series of **escape sequence** to move the cursor, insert and delete characters or lines at the cursor, and so on

为了支持在字符串中间插入这种事情而诞生的

<img src="./image/2022-11-09-20-08-50.png" width=%>

#### 5.6.2.3 Graphical User Interface

A  GUI (Graphical User Interface) has four essential elements:  Windows, Icons, Menus, and Pointing device.

<img src="./image/2022-11-09-20-12-13.png" width=80%>

用win32的绘图API可以画出这种玩意：

<img src="./image/2022-11-09-20-32-27.png" width=80%>

#### 5.6.2.4 Bitmaps

`BitBlt`: it copies a bitmap from a rectangle in one window to a rectangle in another window (or the same one).

<img src="./image/2022-11-09-20-36-00.png" width=80%>

#### 5.6.2.5 Fonts

以前的字体是通过`BitBlt`映射上去的。这存在个问题：假如我原本字体是10-point，而打印的时候想要打印成12-point，那么就完全没法做到

TrueType
: Each **TrueType** Font is defined by a sequence of points around its perimeter (周长). All the points are relative to the (0,0) origin.

<img src="./image/2022-11-09-20-40-19.png" width=49%>

## 5.8 Power Management

### 5.8.1 Hardware Issues

<img src="./image/2022-11-09-20-43-51.png" width=70%>

The most common method to save battery is to design the devices to have ==multiple states==: On, Sleep, and Off.

---

总之，只要用户愿意牺牲一点体验，就可以换得好点的续航：
- Abandon the color information and display the video in black and white.
- Use radio link to send task to other devices.
- Trading image quality to reduce the transmission overload.


### 5.8.2 OS Issues

#### 5.8.2.3 The CPU

当然是降频

<img src="./image/2022-11-09-20-45-45.png" width=70%>



## 习题

<img src="./image/2022-11-08-21-44-36.png" width=70%>

---

<img src="./image/2022-11-08-21-49-42.png" width=70%>

见[5.3](#53-io-software-layers)的那个结构图

---

<img src="./image/2022-11-08-21-50-36.png" width=80%>

A:

换句话说，我们只需要知道0.8ms内，cylinder转过了多少个sector:
$$
\frac{0.8}{10}*500=40
$$

---

<img src="./image/2022-11-08-21-54-57.png" width=80%>

A:

(a):

$$
16\cdot 100\cdot 512\times (160+200+240+280)=720896000
$$

!!! note
    16个head真的表示有16层？？？

(b):

zone1:
$$
\frac{1\text{ms} }{1\text{s} }\times \frac{7200}{60}\times 160=19.2
$$

zone2:
$$
\frac{1\text{ms} }{1\text{s} }\times \frac{7200}{60}\times 200=24
$$

zone3:
$$
\frac{1\text{ms} }{1\text{s} }\times \frac{7200}{60}\times 240=28.8
$$

zone4:
$$
\frac{1\text{ms} }{1\text{s} }\times \frac{7200}{60}\times 280=33.6
$$

(c):

4个zone的data transfer rate是不一样的，sector数量越多则越大，所以zone4最大
$$
\frac{7200}{60}\times 280\times 512=17203200
$$

---

<img src="./image/2022-11-08-22-05-30.png" width=%>

A:

(a)

顺序不变
$$
(10+12+2+18+38+34+32)\times 6=876\text{ms}
$$

(b)

顺序为20,20,22,10,6,2,38,40
$$
(0+2+12+4+4+36+2)\times 6=360\text{ms}
$$

(c)

顺序为20,20,22,38,40,10,6,2
$$
(0+2+16+2+30+4+4)\times 6=348\text{ms}
$$

---

<img src="./image/2022-11-08-22-10-35.png" width=70%>

注意 B 是错的（好像一般用 C 写）；C 居然是是对的

---

<img src="./image/2022-11-08-22-10-52.png" width=70%>

纯脑补可以想出来，主要是前面的block在干事情的时候，其他的block也可以并行干其它事情

single kernel buffer:
$$
200+9*150=1550
$$

double kernel buffer:
$$
200+9*100=1100
$$

---

<img src="./image/2022-11-08-22-27-09.png" width=70%>

---

<img src="./image/2022-11-08-22-29-20.png" width=70%>

$$
\frac{7200}{60}\times 160\times 512 \div 1024=9600
$$

要除1024是因为单位有个K

---

<img src="./image/2022-11-08-22-35-47.png" width=70%>

可以想象假如 $b$ 特别大的话，就需要写入 $b/N$ 个 track，而每写一个 track 需要的时间是 $r$，写完一个 track 之后去找下一个的时间是 $T$

反正是个逆天题目

---

<img src="./image/2022-11-10-08-55-11.png" width=80%>

A:
$$
\frac{60\times 2\text{ms} }{1\text{s} }=12\%
$$

---

<img src="./image/2022-11-10-09-06-31.png" width=70%>

这题问得就离谱。。。这东西需要知道些常识: [Year 2038 problem - Wikipedia..](https://en.wikipedia.org/wiki/Year_2038_problem#:~:text=Consequently%2C%20if%20a%20signed%2032,on%20Tuesday%2C%2019%20January%202038.)

重点的话在于：
> the number of seconds elapsed since the Unix epoch (00:00:00 UTC on ==1 January 1970==)

没错，这个时间是从1970年开始算的。所以：

$$
1970+\frac{2^{32} }{365\cdot24\cdot60\cdot60}=2106
$$

---

<img src="./image/2022-11-10-09-13-53.png" width=%>

A:

$$
\frac{20\text{cm/s} }{0.1\text{mm} }\times 3\text{byte}=6000\text{byte/s}
$$

---

<img src="./image/2022-11-10-09-28-57.png" width=90%>

A:

(1):

我们可以将处理速度降到$1$ char/s，而现在是$\frac{1\text{s} }{100\text{ms} }=10$ char/s，所以对应的$n$为 (频率下降幅度):

$$
n=\frac{10}{1}=10
$$

(2):

假设我们原本的功耗是$E$

原本：
$$
\frac{100\text{ms} }{1\text{s} }\cdot E=0.1E
$$

砍功耗之后：
$$
1\text{s}\cdot \frac{E}{10^2}=0.01E
$$

也就是说，省了90\%的功耗

---

<img src="./image/2022-11-15-16-36-26.png" width=70%>

---

<img src="./image/2022-11-15-16-36-57.png" width=70%>

---

<img src="./image/2022-11-15-16-37-17.png" width=49%>

A:

参考[5.4.3](#543-disk-arm-scheduling-algorithms)

- FCFS
- SSF
- elevator algorithm

考试真要这么考的话也太无聊了

