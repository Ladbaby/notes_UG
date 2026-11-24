## 2.1 Process

process
: - a program in execution
: - a container that holds all the information needed to run a program

pseudoparallelism
: the CPU switches from process to process quickly, running each for tens or hundreds of milliseconds

疯狂来回切换，实际上一个时间点只会处理一个进程

和真正并行的**multiprocessor**做区分


### 2.1.1 The Process Model
**multiprogramming**:
> In reality, of course, the real CPU switches back and forth from process to process

<img src="./image/2022-09-05-14-38-43.png" width=%>


### 2.1.2 Process Creation
Events that cause process creation:
- System initialization
- Created by a running process.
- User request to create a new process
- Initiation of a batch job

**daemon**:
> Background processes that handle some incoming request such as email, Web pages, news, printing, and so on

接着来看看不同系统下是怎么做到的：
- **Unix/Linux**

    显然就是`fork()`函数了

    > `fork()`假如是在主进程里，那么返回的就是非0的==进程pid==，假如是在子进程里，那么返回的就是0
- **Windows**

    `CreateProcess`函数

### 2.1.3 Process Termination
- **Normal exit** (voluntary)

	“Exit” in UNIX and “ExitProcess” in Windows.
- **Error exit** (voluntary)

	Example: input file is not exist.
- **Fatal error** (involuntary)

	Example: referencing nonexistent memory.
- **Killed by another process** (involuntary)

	“Kill” in UNIX and “TerminateProcess” in Windows.

<img src="./image/2022-09-05-14-54-54.png" width=%>

### 2.1.5 Process States
<img src="./image/2022-09-05-14-55-37.png" width=%>

- **Running**：using the CPU at that instant.
- **Ready**：runnable; temporarily stopped to let another process run.
- **Blocked**：unable to run until some external event happens.

### 2.1.6 Implementation of Processes
The **process table**, with one entry per process, that is, **process control blocks**

<img src="./image/2022-09-05-15-03-10.png" width=%>

**context switch**:

When a context switch occurs between processes P1 and P2, the current state of the RUNNING process, say P1, is saved in the PCB for process P1 and the state of a READY process, say P2, is restored from the PCB for process P2 to the CPU registers, etc. Then, process P2 begins RUNNING.

### 2.1.7 Modeling Multiprogramming
Suppose that a process spends a fraction p of its time waiting for I/O to complete. With $n$ processes in memory at once, the probability that all n processes are waiting for I/O (in which case the CPU will be idle) is $p^n$. The CPU utilization is then given by the formula:

$$
\text{CPU utilization}=1-p^n
$$

其中$n$叫做**degree of multiprogramming**

<img src="./image/2022-09-05-15-12-09.png" width=%>

## 2.2 Threads
### 2.2.1 Thread Usage
**threads**:
> A thread of execution is the smallest sequence of programmed instructions that can be managed independently by a scheduler, which is typically a part of the operating system. The implementation of threads and processes differs between operating systems, but in most cases ==a thread is a component of a process==. Multiple threads can exist within one process, ==executing concurrently and sharing resources such as memory==, while different processes do not share these resources. In particular, the threads of a process share its executable code and the values of its variables at any given time.

<img src="./image/2022-09-05-15-33-35.png" width=90%>

线程相比进程可以共享内存

- **Responsiveness**: multiple activities can be done at the same time. 
- **Resource Sharing**: threads share the memory and the resources of the process.
- **Economy**: threads are easy to create and destroy.
- **Utilization of MP (multiprocessor) Architectures**: threads are useful on multiple CPU systems

### 2.2.2 The Classical Thread Model
<img src="./image/2022-09-05-15-35-09.png" width=%>

有些是public，有些是private的：

<img src="./image/2022-09-05-15-47-13.png" width=%>

不同系统下：
- **Linux**

    <img src="./image/2022-09-05-15-49-55.png" width=%>

- **Windows**

    <img src="./image/2022-09-05-15-50-18.png" width=%>

<img src="./image/2022-09-05-15-52-03.png" width=90%>

### 2.2.3 POSIX Threads
> **POSIX (Portable Operating System Interface)** is a set of standard operating system interfaces based on the Unix operating system. 

主要是为了统一标准用的

<img src="./image/2022-09-05-15-58-58.png" width=%>

### 2.2.4 Implementing Thread in User Space
- **Advantages**: fast, flexible, scalable
- **Drawbacks**：

    - Blocking blocks all threads in a process; 
    - No thread-level parallelism on multiprocessor.

<img src="./image/2022-09-05-16-02-03.png" width=60%>

### 2.2.5 Implementing Thread in the Kernel
- **Advantages**: Blocking blocks only the appropriate thread in a process; Support thread-level parallelism on multiprocessor;
- **Disadvantages**: Slow thread management; large thread tables

<img src="./image/2022-09-05-16-03-48.png" width=60%>

### 2.2.6 Hybrid Implementations
- Multiplex user-level threads on kernel threads. Kernel is only aware of the kernel-level threads and schedule those.  
- More flexible, but more complicated.

<img src="./image/2022-09-05-16-05-23.png" width=70%>

## 2.3 Interprocess Communication 
**IPC**

关于这玩意存在三个问题：
- how one process can pass information to another
- making sure two or more processes do not get in each other’s way

    比如两个人同时抢最后一张票
- proper sequencing when dependencies are present

    进程之间存在依赖关系

### 2.3.1 Race Conditions
> Situations like this, where two or more processes are reading or writing some shared data and the final result depends on who runs precisely when, are called **race conditions**

两个进程假如修改同一个东西的话，显然后面修改的那个的操作会得到保留，前一个做的操作相当于白做了

### 2.3.2 Critical Regions
我们要怎么样防止race condition呢?

核心思想是**mutual exclusion**:
> some way of making sure that if one process is using a shared variable or file, the other processes will be ==excluded== from doing the same thing

**critical region**:
> That part of the ==program where the shared memory is accessed== is called the **critical region** or critical section

我们需要保证的事情如下：
- No two processes may be simultaneously inside their critical regions.
- No assumptions may be made about speeds or the number of CPUs.
- No process running outside its critical region may block any process.
- No process should have to wait forever to enter its critical region.

<img src="./image/2022-09-19-14-25-52.png" width=%>

图中这样就保证了没有两个进程同时进入critical region

### 2.3.3 Mutual Exclusion with Busy Waiting
#### Disabling Interrupts
把是否接受interrupt的选择权交给了用户

问题也非常明显，就是用户很可能非常贪心，以至于永远不接受interrupt

#### Lock Variables
我们存一个shared (lock) variable，平时它的值是0

假如一个进程想要进入critical region，他就先测试一下这个变量是不是0。假如是0的话，我们就设置成1，并且进入critical region；不是的话就等

但这方法显然也有缺点：在一个进程读取了0而还没来得及把变量设置成1时，另一个进程可能也会读到0并且也试图同时修改这个变量

#### Strict Alternation
严格轮流执行

<img src="./image/2022-09-19-14-40-50.png" width=%>

比如这段代码，左右两段代码就会交替执行`critical_region()`，而`while(turn != 0)`这种不断测试一个变量的值的行为叫做**busy waiting**

缺点也非常明显，代码的效率太低了，而且一个进程可能会等待一个不处在critical region的进程（因为执行`noncritical_region()`也需要一点点时间）

#### Peterson's Solution
改进了strict alternation，是个诡异的方法

<img src="./image/2022-09-19-14-55-21.png" width=%>

> Now consider the case that both processes call enter region ==almost simultaneously==. Both will store their process number in turn. Whichever store is done last is the one that counts; the first one is overwritten and lost. Suppose that ==process 1 stores last==, so turn is 1. When both processes come to the while statement, ==process 0 executes it zero times and enters its critical region==. Process 1 loops and does not enter its critical region until process 0 exits its critical region.

用一种诡异的方法，让process 0被process 1覆盖掉了之后依然可以先进critical region

#### The TSL Instruction
这是一种需要硬件帮忙的解法

<img src="./image/2022-09-19-15-02-19.png" width=%>

> Before entering its critical region, a process calls enter region, which does busy waiting until the lock is free; then it acquires the lock and returns. After leaving the critical region the process calls leave region, which stores a 0 in lock. As with all solutions based on critical regions, the processes must call enter region and leave region at the correct times for the method to work. 

也就是说，这个方法的问题在于：
> If one process cheats, the mutual exclusion will fail. In other words, critical regions work only if the processes cooperate

必须要软件配合

### 2.3.4 Sleep and Wakeup
之前提到的解法都需要busy waiting，不仅会浪费时间，而且会导致**priority inversion problem**:
>  Consider a computer with two processes, $H$, with high priority, and $L$, with low priority. The scheduling rules are such that $H$ is run whenever it is in ready state. At a certain moment, with $L$ in its critical region, $H$ becomes ready to run (e.g., an I/O operation completes). $H$ now begins busy waiting, but since ==$L$ is never scheduled while $H$ is running, $L$ never gets the chance to leave its critical region==, so $H$ loops forever

什么zz逻辑

- **sleep**

    顾名思义，进程睡觉去了
- **wakeup**

    轻轻敲醒沉睡的心灵

#### The Producer-Consumer Problem
一个存在race condition问题的奇葩问题

见P160底下开始的描述

### 2.3.5 Semaphores
> is a structure consisting of two parts:
> - an integer counter, COUNT
> - a queue of pids of blocked processes, Q

是为了记录number of wakeup而提出的

```cpp{.line-numbers}
struct sem_struct {
    int count;
    queue Q;
} semaphore;

semaphore S;
```
There are two operations on semaphores:
- **DOWN** (P).  

    generalization of **sleep**

    The *down* operation on a semaphore checks to see if the value is greater than 0:
    - $>0$ 

        it decrements the value (i.e., ==uses up one stored wakeup==) and just continues.
    - $<=0$
    
        the process is put to ==sleep without completing the down for the moment==

        会进入等待状态

- **UP** (V) 

    generalization of **wakeup**

    increments the value of the semaphore addressed


    > If one or more processes were sleeping on that semaphore, unable to complete an earlier down operation, ==one of them is chosen by the system== (e.g., at random) and is allowed to complete its *down*. Thus, after an up on a semaphore with processes sleeping on it, ==the semaphore will still be 0, but there will be one fewer process sleeping on it==   

    !!! note
        No process ever blocks doing an **up**



These operations must be executed ==atomically== (that is in mutual exclusion).

#### Solving the Producer-Consumer Problem Using Semaphores
详细描述见P162

大概就是使用三个semaphores:
- full

    保证满的时候，producer不会放入
- empty

    保证空的时候，consumer不会吃
- mutex

    保证对货架进行操作的时候，是mutual exclusion的

从这个例子可以引出，semaphore的还有一种用法是**synchronization**，The full and empty semaphores are needed to ==guarantee that certain event sequences do or do not occur==. ==这种保证某件事情发生/不发生的用法，和之前用以保证**mutual exclusion**的用法是有所不同的==

<img src="./image/2022-09-19-15-46-58.png" width=80%>

### 2.3.6 Mutexes
当你不需要使用semaphore的计数能力的时候，你可以用简化版本的，叫做**mutex**:
> A mutex is a shared variable that can be in one of two states: unlocked or locked.

### 2.3.7 Monitors
semaphore一旦写了个错误的逻辑，就会导致严重的错误，所以我们需要更加阳间的方法

**monitor**:
> A monitor is a collection of procedures, variables, and data structures that are all grouped together in a special kind of module or package

```cpp{.line-numbers}
monitor example
    integer i;
    condition c;

    procedure producer( );
    .
    .
    .
    end;

    procedure consumer( );
    ...
    end;
end monitor;
```
monitor有一个重要的性质：==only one process can be active in a monitor at any instant==

!!! note
    注意区分process和procedure。process是进入monitor运行的进程，而procedure则是monitor的一部分

> Monitors are a ==programming-language construct==, so the compiler knows they are special and can handle calls to monitor procedures differently from other procedure calls. Typically, when a process calls a monitor procedure, the first few instructions of the procedure will ==check to see if any other process is currently active within the monitor==. If so, the calling process will be ==suspended== until the other process has left the monitor. If no other process is using the monitor, the calling process may enter.

从这段话可以看出，使用monitor的时候，是由compiler在管理如何实现mutual exclusion，所以出错的概率低很多

---

假如我们遇到了process必须被block的情况（如producer发现货架已经满了），这时候就需要这个process在monitor里面"等待"。等待的时候，可以允许其它process进入monitor

为了允许process在monitor里面等待，我们需要**condition variables**，以及对应的操作**wait**和**signal**
- **wait**

    比如producer发现buffer满了，他就会对condition variable（比如full）执行**wait**的操作
- **signal**

    consumer可以通过对condition variable执行**signal**来唤醒正在等待的一个进程

    为了避免monitor里同时有两个活动的进程，我们可以要求发送signal的进程必须立刻退出critical region
    
用monitor来解决producer consumer问题

<img src="./image/2022-09-26-14-36-21.png" width=%>

- **优点**

    易于编程
- **缺点**

    难于实现

monitor和semaphore的区别：

<img src="./image/2022-09-26-14-43-47.png" width=%>

### 2.3.8 Message Passing
monitor和mutex都面临一个很大的问题：在面对分布式计算的时候，不同CPU之间的通信实际上是通过局域网完成的，他们并不共享同一块内存，也就没法用邪恶的全局变量

所以我们请出**message passing**，它需要两个玩意：
- **send**

    比如
    ```cpp{.line-numbers}
    send(destination, &message);
    ```
- **receive**

    ```cpp{.line-numbers}
    receive(source, &message);
    ```

和semaphore一样属于system call，和monitor的language constructs不同

---

同步和异步两种：

<img src="./image/2022-09-26-14-56-05.png" width=90%>

sender更倾向于异步，receiver更倾向于同步（需要信息）

三种组合：

<img src="./image/2022-09-26-14-57-43.png" width=80%>

---

这玩意一般会用于parallel programming system，比如MPI (Message-Passing Interface)

## 2.4 Scheduling
### 2.4.1 Introduction to Scheduling
**scheduler**:
> A part of the operating system that decides which process is to be run next

**scheduling algorithm**:
> a policy used by the scheduler to make that decision

To make sure that no process runs too long, a clock is used to cause a periodic interrupt (usually around 50-60 Hz); that is, about every 20 msec

**Preemptive Scheduling**:
> allows processes that are runnable to be temporarily suspended so that other processes can have a chance to use the CPU


#### Process Behavior
<img src="./image/2022-09-26-15-02-27.png" width=%>

第一种情况的CPU处理时间远大于I/O，叫做**CPU-bound**，另一种叫做**I/O bound**

#### When to Schedule
- When a new process is created;
- When a process exist;
- When a process blocks on I/O;
- When an I/O interrupt occurs (e.g., clock interrupt).

#### Scheduling Algorithm Goals
- **Fairness** 

    each process gets its fair share of time with the CPU.
- **Efficiency** 

    keep the CPU busy doing productive work.
- **Response Time**

    minimize the response time for interactive users.
- **Turnaround Time**

    minimize the average time from a batch job being submitted until it is completed.
- **Throughput**

    maximize the number of jobs processed per hour.

### 2.4.2 Scheduling in Batch Systems
#### First-Come, First-Served (FCFS)
看名字就能懂

e.g.

<img src="./image/2022-09-26-15-16-02.png" width=70%>

#### Shortest Job First
顾名思义

只不过这种也有两种:
- **non-preemptive**

    非先发制人

    也就是不可被剥夺

    e.g.

    <img src="./image/2022-09-26-15-21-05.png" width=80%>
- **preemptive**

    <img src="./image/2022-09-26-15-21-32.png" width=80%>

### 2.4.3 Scheduling in Interactive Systems
#### Round-Robin Scheduling
> Each process is assigned a time interval, called its **quantum** /ˈkwɒntəm/, during which it is allowed to run

每个进程都只允许运行一点点的时间

切换进程的操作叫做 **process switch**，或者叫**context switch**

显然假如 context switch太过于频繁的话，那么对于性能的损失就会比较明显

一般来说，turnaround time 会比 SJF 高，但是response会更好

#### Priority Scheduling
给每个进程分配一个优先级，数字越==小==优先级越高，CPU拥有最高优先级

为了防止低优先级的进程永远不会被执行，我们需要**aging**: 随着时间的推移，提高优先级

<img src="./image/2022-09-26-15-55-16.png" width=70%>

#### Shortest Process Next
让花费时间最短的进程先来，和batch system下的shortest job next是一个想法

然而我咋知道哪个进程需要的时间最短呢？在batch system里我们还能知道真实数值，而在interactive system里面，就只能==估计==一下了
> Suppose that the estimated time per command for some process is $T_0$. Now suppose its next run is measured to be $T_1$. We could update our estimate by taking a weighted sum of these two numbers, that is, $aT_0 + (1 − a)T_1$.

可以看出来$a$取不同的值的时候，就可以控制记住旧的数值的比例，$a$小的时候忘记旧的数值就会非常快

这种技巧叫做**aging** (和priority scheduling的不同)

#### Guaranteed Scheduling
你可以做出一些承诺，比如$n$个进程同时在跑的话，每个进程可以得到$1/n$的CPU cycles

至于怎么兑现上面的承诺呢？我们实际计算所有进程实际使用的CPU cycles time，除以我们期望他们得到的时间，得到一个ratio。按照这个ratio从低到高排列，最低的那个就会优先执行

#### Lottery Scheduling
看名字就觉得很玄乎

以CPU资源为例，我们会先给所有进程一些彩票。每当CPU需要处理其中一个进城的时候，它就随机抽一张彩票，中奖的进程就可以被执行

#### Fair-Share Scheduling
之前的所有scheduling都只考虑了单个用户所拥有的进程，没考虑多个用户的情况下他们的进程要怎么分配

我们应该让不同用户之间拥有固定的权重分配

e.g.

consider a system with two users, each of which has been promised 50% of the CPU. 

User 1 has four processes, A, B, C, and D, and user 2 has only one process, E

If round-robin scheduling is used, a possible scheduling sequence that meets all the constraints is this one:

A E B E C E D E A E B E C E D E

假如不用fair-share的话，就会变成:

A B C D E A B C D E

显然不用fair-share的话，进程多的那个用户就会很赚

### 2.4.6 Thread Scheduling
round-robin和priority scheduling最常用
#### User-level threads
<img src="./image/2022-10-02-16-39-13.png" width=%>

如图a所示，kernel并不能调用其它process里面的线程

#### Kernel-level threads
如图b所示，kernel可以调用其它process的thread

两种的主要区别在于性能：kernel的性能差很多。而且user-level甚至可以使用application-specific thread scheduler，得到更好的性能表现

## 2.5 Classic IPC Problems

### 2.5.1 The Dinning Philosophers Problem

反正书上给的解决方案如下：

<img src="./image/2023-02-22-20-03-50.png" width=%>

需要一个数组存储每个人的状态，需要一个 mutex 来保护这个数组，然后每个哲学家需要一个 semaphore 来保证自己能够占用叉子

反正需要修改 state 数组的值的时候，就用 mutex 来保护一下这段 critical region

为了防止有的进程会在 critical region 里面 blocking，导致所有的哲学家都要等那一个人出 region，我们就用 test 方法来测试两侧人的状态，假如都是饥饿的话，就允许ta出了 critical region 之后 down 自己的那个 semaphore，顺利进入吃饭状态，否则就一直等候

当吃完之后，吃完的人会帮身边俩人 test 一下

### 2.5.2 The Readers and Writers Problem

<img src="./image/2023-02-22-22-16-12.png" width=%>

需要 reader count 的变量，一个保护 reader count 的变量，和一个保护 database 的变量

reader 这边读之前和读之后都需要操作一下 reader counter 的变量，所以都需要 mutex 来保护。改变 rc 的时候需要顺带检查一下边界情况，防止 writer 在还有人在读书的时候写东西

writer 这边倒是很简单

## 2.? Thread VS Process

以下回答来自 ChatGPT：
1.  Definition: A process can be thought of as an executing program, which includes code, data, and system resources such as memory, file handles, and other system resources. A thread is a lightweight unit of execution within a process, with its own stack and program counter, but shares the memory and other resources of its parent process.
    
2.  Resource Management: Each process has its own memory space, and different processes cannot access each other's memory directly. In contrast, threads within the same process share the same memory space and can directly access the same memory.
    
3.  Creation and Termination: Processes are typically created and terminated independently of each other, and each process is a separate instance of a program. In contrast, threads are typically created within a process, and the parent process is responsible for creating and terminating its own threads.
    
4.  Overhead: Processes are heavyweight in terms of system resources, requiring their own memory space, file handles, and other system resources. In contrast, threads are lightweight, with less overhead than processes, because they share memory and other resources with their parent process.
    
5.  Concurrency: Since threads share the same memory space, they can communicate and synchronize more easily with each other than processes can. Synchronization between processes typically involves more overhead, such as inter-process communication (IPC) mechanisms like pipes, sockets, or shared memory.

## 题目

<img src="./image/2022-09-12-19-48-23.png" width=70%>

C 应该是错在 top

---

<img src="./image/2022-09-12-19-49-55.png" width=70%>

A 好像压根没讲过。。。CPU scheduling 的基本单位在 Windows 里是 thread，在 Linux 和 MacOS 里是 process，然而课程里把 thread 当作基本单位

---

<img src="./image/2022-09-12-19-50-39.png" width=70%>

---

<img src="./image/2022-09-25-10-31-53.png" width=70%>

反正 critical region 无论如何是不允许两个不同的 process 同时进入的，只不过处在 critical region 的 process 可以被暂停而已

---

<img src="./image/2022-09-25-10-33-04.png" width=70%>

synchronization 居然初始值是 0 (保证在前一个进程 UP 之前，后面的进程不会被执行) 

---

<img src="./image/2022-09-25-10-34-23.png" width=70%>

说明资源总共有三个，现在只有两个处于使用，甚至多了一个空闲的，所以肯定不存在等待的 process

---

<img src="./image/2022-09-25-10-35-38.png" width=70%>

```cpp{.line-numbers}
Semaphore S1=0; 
Semaphore S2=1; 
main ()
{    Cobegin 
{    进程P1
    {
        while (true)
        {
        P (S1);                // 申请拣白子  
        拣一白子；
        V (S2);                // 允许拣黑子  
        }
    }
    进程P2
    {
        while (true)
        {
        P (S2);                // 申请拣黑子  
        拣一黑子；
        V (S1);                // 允许拣白子 
        } 
    }
}
Coend
}
```

!!! note
    两个semaphore，实现 synchronization（保证轮流执行，假如只用一个 semaphore 的话就可能会 同一个 process 连续执行）

除此之外，c-6的ppt里面p4-p25还有一些无聊的classical IPC problems，复习的时候记得看，对应书上的2.5

---

<img src="./image/2022-10-02-16-43-53.png" width=49%>

---

<img src="./image/2022-10-02-16-44-19.png" width=49%>

即便在critical region也是可以被打断的！和前面的有个题一样

---

<img src="./image/2022-10-02-16-46-02.png" width=49%>

合理，反正肯定不是 blocked

---

<img src="./image/2022-10-02-16-46-20.png" width=49%>

round robin 一看就是最公平的

---

<img src="./image/2022-10-02-16-46-30.png" width=49%>

response ratio
: is defined as the sum of the waiting time and the execution time divided by the execution time

也就是说，越接近 1 则等待的时间相对较短。这个值越大，则应该提高其优先级，所以是对的

---

<img src="./image/2022-10-02-16-47-09.png" width=50%>

<img src="./image/2022-10-02-16-47-20.png" width=50%>

<img src="./image/2022-10-02-16-47-38.png" width=49%>


RR的计算比较有意思，他有个很重要的思想，就是假定直到某一个进程运行完之前，==所有正在跑的进程都跑过了相同的时间==

---

<img src="./image/2023-01-25-20-07-20.png" width=70%>

```cpp{.line-numbers}
semaphore S0 = 1, S1 = 0, S2 = N;
in = out = 0;
// A
while (true) {
    generate data m;
    P(S2);
    P(S0);
    buffer(in) = m;
    in = (in + 1) % N;
    V(S1);
    V(S0);
}
// B
while (true) {
    P(S1);
    P(S0);
    m = buffer(out);
    out = (out + 1) % N;
    V(S2);
    V(S0);
}
```

关于这里为什么需要三个 semaphore：
- `S0`

    mutual exclusion。由于并没有要求 A, B 一定要轮流来执行，所以不需要两个 semaphore (不像前面的那个题)
- `S1`

    记录当前的产品数量，==防止 B 吃的太多==
- `S2`

    记录当前的空槽数量，==防止 A 生产太多==
