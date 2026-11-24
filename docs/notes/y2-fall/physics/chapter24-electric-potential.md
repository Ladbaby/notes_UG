## 1. 点电荷引起的电势
$$V=\frac{1}{4\pi\varepsilon_0}\frac{q}{r}$$

## 2. 电偶极子引起的电势
<img src="./image/屏幕截图%202021-12-30%20160211.jpg" height=50%>

显然我们把两个电荷的电势叠加一下：
$$V=\frac{q}{4\pi\varepsilon_0}\frac{r_{(-)}-r_{(+)} }{r_{(-)}r_{(+)} }$$
再做两个近似：
$$r_{(-)}-r_{(+)}\approx dcos\theta\\r_{(-)}r_{(+)}=r^2$$
带入之后可以化简为：
$$V=\frac{q}{4\pi\varepsilon_0}\frac{dcos\theta}{r^2}\\~\\=\frac{1}{4\pi\varepsilon_0}\frac{pcos\theta}{r^2}$$

## 3. 电荷线
<img src="./image/屏幕截图%202021-12-30%20161950.jpg" width=50%>

书上的这个积分是从x=0到x=L的积分，也就是==只积了一边==
$$V=\frac{\lambda}{4\pi\varepsilon_0}[ln(x+(x^2+d^2)^{1/2})]_o^L\\~\\=\frac{1}{4\pi\varepsilon_0}ln[\frac{L+(L^2+d^2)^{1/2} }{d}]$$

## 4. 带电圆盘
同样的思路
$$dq=\sigma(2\pi R')dR'\\~\\dV=\frac{1}{4\pi\varepsilon_0}\frac{dq}{r}\\~\\\rArr V=\frac{\sigma}{2\varepsilon_0}\int_0^R\frac{R'dR'}{\sqrt{z^2+R'^2} }\\~\\=\frac{\sigma}{2\varepsilon_0}(\sqrt{z^2+R^2}-z)$$

## 5. 由电势求电场强度
$$E=-\frac{\partial V}{\partial s}$$
看着确实是废话，记得有个负号就行了
## 6. 点电荷系统的电势能
求解的思路是，等于把各点电荷从无穷远处移入系统时外力做的功

显然当电荷只有俩时，势能为：
$$U=\frac{1}{4\pi\varepsilon_0}\frac{q_1q_2}{r}$$
不难得到，有仨电荷时。电势为两两电势之和（$U_{12}+U_{13}+U_{23}$）
> 有时候要求的是电势能而不是电势，别傻了