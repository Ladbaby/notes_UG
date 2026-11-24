## 1. 计算电容相关的物理量
### 1.1 计算任意形状电容器的电场强度
借助高斯定理可以得到：
$$q=\varepsilon_0EA\\~\\\rArr E=\frac{q}{\varepsilon_0A}$$

### 1.2 平行板电容器
把q和V的表达式代入q=CV可得：
$$C=\frac{\varepsilon_0A}{d}$$
其实就是和高中的那个$C=\frac{A}{4\pi kd}$一模一样

### 1.3 圆柱形电容器
<img src="./image/屏幕截图%202021-12-31%20105847.jpg" width=50%>

就是积分积得麻烦点

首先通过高斯定律求一下电场强度：
$$q=\varepsilon_0 E(2\pi rL)\\~\\\rArr E=\frac{q}{2\pi \varepsilon_0 Lr}$$
然后积分求一下电势差：
$$-V=\int_b^aEds=\frac{q}{2\pi \varepsilon_0L}ln(\frac{a}{b})$$
最后带入一下就行：
$$C=2\pi \varepsilon_0\frac{L}{ln(b/a)}$$

### 1.4 球形电容器
也可以参考上面那张图来算

思路都是一样的：
$$q=4\pi r^2\varepsilon_0E\\~\\\rArr E=\frac{1}{4\pi \varepsilon_0}\frac{q}{r^2}\\~\\V=\int_b^aEds=\frac{q}{4\pi \varepsilon_0}\frac{b-a}{ab}\\~\\\rArr C=4\pi \varepsilon_0\frac{ab}{b-a}$$

### 1.5 孤立球体
可以看成是球形电容器的特殊情况：把外面的极板移动到无限远处

于是乎，令$b\rightarrow\infty$，且$a=R$，直接代入1.4中的式子得到：
$$C=4\pi \varepsilon_0R$$

## 2. 电容器串并联
略，你懂的

## 3. 存储的能量
### 3.1 能量
$$U=\frac{1}{2}CV^2$$

### 3.2 能量密度
即极板间每单位体积的电势能，这里以平行板电容器切入：
$$u=\frac{U}{Ad}=\frac{CV^2}{2Ad}$$
把$C=\varepsilon_0A/d$代入：
$$u=\frac{1}{2}\varepsilon_0(\frac{V}{d})^2=\frac{1}{2}\varepsilon_0E^2$$
注意这个结果是==普遍适用==的！

## 4. 有介电质的电容
- 介电常量$\kappa$
> 我怎么记得一般是写成$\varepsilon$的
- 在被介电常量为$\kappa$的介电材料填充的区域之中，所有静电学公式都可以==把$\varepsilon_0$替换成$\kappa\varepsilon_0$（包括高斯定律，但是此时只考虑极板上的自由电荷，而不考虑电介质中的感生电荷）==
> 有一种==不能直接替代==的情况，是计算平行板电容的时候不能直接用推论式子$C=\varepsilon_0A/d$，而要通过$C=q/V$重新推导一遍。反正推导的结果是$C=\frac{\varepsilon_oA}{(d-b)+\frac{b}{\kappa} }$，其中b是电介质的厚度

这表明==电介质可以削弱真空状态下的电场以$\kappa$的比例==(很多时候可以这样计算偷懒)
- 一个例题：<br><img src="./image/屏幕截图%202021-12-31%20152151.jpg" width=80%>
    - 在这种电介质并没有完全填充满的情况下，电场强度在空气中的部分是正常的（分析高斯面I，高斯面中有电通量穿过的部分位于空气中，所以$\kappa=1$）,而在电解质中的部分就是需要特殊考虑的（分析高斯面II，高斯面中有电通量的部分位于电解质中，所以$\kappa\neq1$）
    - 在计算两端的电压之时，应当把两部分的电场强度分别考虑再相加
