## 1.1 Organization and Architecture
- **computer architecture**

    > ==attributes== of a system visible to a programmer

    eg.
    - instruction set
    - number of bits used to represent various data types
    - I/O mechanisms
    - techniques for addressing memory

- **computer organization**

    > ==operational units and their interconnections== that ==realize== the architectural specifications

    eg:(hardware details transparent to the programmer)
    - control signals
    
        对应architecture里的instruction set

        注意==不等于binary signal==
    - bus width

        对应number of bits
    - memory technology used

        对应addressing techniques

> 总之，organization是architecture的==实现==

## 1.2 Structure and Function
- **Hierarchical Nature of Complex Systems**
    > a set of interrelated ==subsystems==

    有层级结构，一层层往上==抽象==

    &nbsp;

    每一层的结构包含a set of ==components== and their interrelationships

    &nbsp;

    在每一层，我们关注的是：
    - **Structure** is the way in which components relate to each other
    - **Function** is the operation of individual components as part of the structure
- **Features**

    - Breaking system into components forces designer to detail ==understand the data passed== between them
    - Working within the hierarchy, a designer needs to ==only== concern the details of his module
    - Working with a well-defined set of inputs, outputs, and function, designers can completely design their module ==without== any knowledge of how rest of system is made
- **Modular System Design**

    模块化的**优点**：
    - ==Shorten design time== by allowing multiple people with differing expertise to participate
    - A ==more manageable== project
    - A higher ==quality== project
    - A more ==maintainable== system
    - Increased module ==reusability==

    有两种**方法**：
    - **Top Down**

        > Solving a problem by dividing the system into individual ==functions== and building ==components== to satisfy each function

        研究证明一般来说这种方法更加清楚高效

        &nbsp;

        优点：
        - Efficient use of components
        - Easier to meet performance goals of the system specification
        - Clear and effective to understand

    - **Bottom up**

        > Solving a problem using an existing system

        优点：
        - Cheaper in small quantities
        - Design ==time== is reduced
        - ==Past experiences== can be drawn upon

### 1.2.1 Function
basic functions that a computer can perform:

<img src="./image/2022-03-05%20115402.png" width=50%>

也就是以下四种：
- **Data processing**

    <img src="./image/2022-03-05%20150719.png" width=49%><img src="./image/2022-03-05%20150815.png" width=49%>

    - The ==basic function== of any computer
    - Describes ==arithmetic and logical operations==
    - Although end-result may be complex, there are ==few distinct types== of data processing
- **Data storage**

    <img src="./image/2022-03-05%20150609.png" width=49%>

    - Short-term storage

        - Temp variables

            eg. buffer containing the last key pressed
        - Program control data

            eg. loop variables
    - Long term storage
        - Data records
        - Data saving
- **Data movement**

    <img src="./image/2022-03-05%20150513.png" width=49%>

    > move data ==between itself and outside world==

    2 types:
    - Peripheral(I/O)

        directly connected
    - Data communications

        remote device
- **Control**

    > Be control of the above three functions

    Is exercised by the individuals through ==instructions==

    &nbsp;

    ==A control unit== manages computer's resources and response to the instructions

### 1.2.2 Structure
<img src="./image/2022-03-05%20151532.png" width=49%>

如上图所示，计算机和外部的联系可以分为两种：
- Peripheral devices
- Communication lines

然而这里我们暂时不关心这些外界联系，我们更关心的是下面的，计算机内部的结构:

<img src="./image/2022-03-05%20151803.png" width=80%>

先从最上面的最顶层结构讲起：
- **CPU**

    - Control the operation of the computer
    - Perform the data processing functions
- **Main memory**

    store data
- **I/O**

    move data
- **System bus**

    mechanism provide for communication among all components

接着来说第二层，CPU的结构：
- **Control unit**

    Control the operation of the CPU
- **ALU**

    > Arithmetic and logic unit

    Perform data processing functions
- **Register**
- **Internal bus**

第三层*control unit*的结构也没必要分开说，就说整体的功能:
- Microprogrammed implementation
- Execute the microinstructions

