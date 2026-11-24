## 1. 三相电路基本概念
生成的三个正弦电压分别为：
$$V_{an}=V_Y\angle0\degree\\V_{bn}=V_Y\angle{-120\degree}\\V_{cn}=V_Y\angle{120\degree}\\$$

上述的称为==正序三相电==，因为我们假装A相电压领先B相电压120°，而B比C领先120°（没错，c虽然看起来是120，其实是-240）

如果先后顺序变为ACB，则称为逆序三相电

## 2. Star-star Connection
<img src="./image/屏幕截图%202021-12-25%20223429.jpg">

概念非常多
- 端线：aA, bB, ...
- 中性线：nN
- 对称三相电路：三个负载电阻相同。这本书只考虑对称的情况
- 相电压：端线与中性线之间的电势差
- 线电压：端线之间的电压差$$V_{ab}=\sqrt{3}V_Y\angle{30\degree}={\textbf V_{an} }\cdot\sqrt{3}\angle{30\degree}\\V_{bc}=\sqrt{3}V_{Y}\angle{-90\degree}={\textbf V_{bn} }\cdot\sqrt{3}\angle{30\degree}\\V_{ca}=\sqrt{3}V_{Y}\angle{150\degree}={\textbf V_{cn} }\cdot\sqrt{3}\angle{30\degree}$$注意等式右边是复数。定义线电压的幅值为$V_L$，则$$V_L=\sqrt{3}V_Y$$
- 相电流：电压源流出的电流
- 线电流：端线中的电流$$I_{aA}=\frac{V_{an} }{Z_Y}=\frac{V_Y\angle{0\degree} }{|Z_Y|\angle{\theta} }=I_L\angle{-\theta}\\ ......$$

通过在中性点处使用KCL可以得到：中性线中没有电流通过，因此可以去掉。

带有中性线的Y-Y连接称为三相四线制，其它称为三相三线制

由于使用的电线根数较少，运输电时可以降低成本

## 3. 三相电路功率
以Y-Y连接为例：
$$p(t)=3\frac{V_YI_L}{2}cos\theta\\ =3V_{Yrms}I_{Lrms}cos\theta$$

可以看出来这瞬时功率是个常数，不随时间变化，相比于单相电路是个优势。

既然瞬时功率等于平均功率等于有功功率，可以看出来这个三相电路的有功功率就是三倍样子，很符合直觉

无功功率的计算方法也是一样，就是把$cos\theta$换成$sin\theta$

## 4. $\Delta-\Delta$连接
<img src="./image/屏幕截图%202021-12-26%20222947.jpg">

在这个接法之中，三个电压源就分别对应了三个不同的线电压了，跟据上一个接法可以得到对应关系：$$V_{ab}=V_L\angle{30\degree}\\V_{bc}=V_{L}\angle{-90\degree}\\V_{ca}=V_{L}\angle{150\degree}$$


各个负载电流按照惯例可以写成：
$$I_{AB}=I_{\Delta}\angle{(30\degree-\theta)}\\I_{BC}=I_{\Delta}\angle{(-90\degree-\theta)}\\I_{CA}=I_{\Delta}\angle{(150\degree-\theta)}\\$$
于是乎可以得到线电流和负载电流之间的关系：
$$I_{aA}={\textbf I_{AB} }\cdot \sqrt{3}\angle{-30\degree}\\I_{bB}={\textbf I_{BC} }\cdot \sqrt{3}\angle{-30\degree}\\I_{cC}={\textbf I_{CA} }\cdot \sqrt{3}\angle{-30\degree}$$
注意后边的I是复数
可以得到线电流幅值和负载电流幅值之间的关系为：
$$I_L=\sqrt{3}I_{\Delta}$$

## 5. 两种电路相互转换
反正大家阻抗都是对称分布的，那么阻抗的变换就可以简化成：
$$Z_Y=Z_{\Delta}/3$$
