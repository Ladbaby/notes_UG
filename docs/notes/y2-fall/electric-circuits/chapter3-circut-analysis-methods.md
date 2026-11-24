## 0. 一些冷知识
理想电压源和理想电流源：
- 两者串联的时候，不考虑电压源，因为电流源的电阻无限大，电压源相当于没有接入
- 两者并联的时候，不考虑电流源，因为电压源电阻为0，理想电流源直接短路
## 1. [Node Voltage Method节点电压法](https://www.khanacademy.org/science/electrical-engineering/ee-circuit-analysis-topic/ee-dc-circuit-analysis/a/ee-node-voltage-method)
其实就是设置0电势点之后，考虑的==每个点的电势==大小，而不是像在KVL里面那样考虑的是用电器两端的电势差。这样显然更加接近真相

这样考虑之后，原本理论上我们需要借助KCL和KVL列出2E个方程的，直接被我们削减成了不需要KVL(可以证明KVL被包含在了节点的电势差之中)。这只是处理2E个方程的其中一种非常聪明的==优化做法==

解题步骤如下：
- Assign a reference node (ground)==设置零电势参考点==.
    - 一般来说会选取所连接的支路较多，且和==电源==相连接的节点
- Assign node voltage names to the remaining nodes.
- Solve the easy nodes first, the ones with a voltage source connected to the reference node.
    - 这个简单的节点一般是连着电源的那个，这时候电势差比较容易确定。当然大多数时候并没有这么理想，那就不管谁更简单了。
- Write Kirchhoff's Current Law for each node. Do Ohm's Law in your head.
    - ==核心步骤，给每个节点列KCL==。用节点之间的电势差及电阻来表示每一个支路的电流大小，直接省去了KVL和欧姆定律的功夫
- Solve the resulting system of equations for all node voltages.
- Solve for any currents you want to know using Ohm's Law.

个人感觉还是非常聪明的优化方法，教材上那种死记结论的论述方式并没有讲到本质上

## 2. [Mesh Current Method网孔电流法](https://www.khanacademy.org/science/electrical-engineering/ee-circuit-analysis-topic/ee-dc-circuit-analysis/a/ee-mesh-current-method)
除了节点电压法之外，第二种简化2E个方程的方法。这次我们设的是每个==网孔==的电流，然后列的是每个==网孔==的KVL方程

网孔：没有包含其它回路的回路（这个回路中只有一个洞）

步骤：
- Identify the meshes.
- Assign a current variable to each mesh, using a consistent direction (clockwise or counterclockwise).
    - ==所有的网孔都只能取同样的绕行方向！==
    - 每一个网孔都有且只有一个电流大小，网孔相交之处便是通过superposition principle进行叠加。==注意叠加原理只适用于线性元件的线性参数==! 即要满足的函数关系式是:

$$F(x_1+x_2)=F(x_1)+F(x_2)\\F(ax)=aF(x)$$
> 以及叠加原理中电流源视为断路，电压源视为短路
- Write Kirchhoff's Voltage Law around each mesh.
    - 其实是有点讲究的，在两个网孔的相交的那条边，虽然两个网孔的假定电流的方向必然是相反的，但是那条边上的电阻只有==单一的假定电势高低==，比如下图中，左边回路之中，认为电流流过这个公共电阻之后电压是降的，那么在右边回路之中则必须认为电流流过这个电阻时是电压升的！<img src="./image/屏幕截图%202021-12-23%20154446.jpg">
- Solve the resulting system of equations for all loop currents.
- Solve for any element currents and voltages you want using Ohm's Law.

## 3. 等效电源定理
终于到我大杀四方了吗，老朋友

## 4. [戴维南等效电路](https://www.electronics-tutorials.ws/dccircuits/dcp_7.html)
虽然说当电路过于复杂的时候，这方法就没有这么好用了，但是这确实是个简化电路的好方法。

分析步骤：
- 选择两个节点A, B，把连接于节点的个别用电器视为负载（怎么选就看实际目的），然后从电路中移除掉负载<img src="./image/屏幕截图%202021-12-23%20171630.jpg">
- 把剩下电路的电源全部处理掉（电压源短路，电流源断路）<img src="./image/屏幕截图%202021-12-23%20171916.jpg">
- 计算剩下元件的等效电阻$R_S$
- 请回电源，但是仍然不管负载，计算一下此时电路之中的$V_{AB}$，即为$V_S$<img src="./image/屏幕截图%202021-12-23%20171653.jpg">
- 可以把负载放回来了，已经得到了简化的电路图<img src="./image/屏幕截图%202021-12-23%20171706.jpg">

## 5. 诺顿等效电路
实际上就是戴维南等效之后使用一次等效电源定理，很没意思
