# Ch3 Determinants

行列式

## 3.1 Introduction to Determinants

对于 $3\times 3$ 的矩阵来说，想要计算行列式很容易：

**Sarrus' rule (沙路法则)**
$$
\operatorname*{det}\left[\begin{array}{c c c}{ {a_{11} }}&{ {a_{12} }}&{ {a_{13} }}\\ { {a_{21} }}&{ {a_{22} }}&{ {a_{23} }}\\ { {a_{31} }}&{ {a_{32} }}&{ {a_{33} }}\end{array}\right]
\\ =a_{11}a_{22}a_{33}+a_{12}a_{23}a_{31}+a_{13}a_{21}a_{32}\\
-a_{31}a_{22}a_{13}-a_{32}a_{23}a_{11}-a_{33}a_{21}a_{12}
$$

## 3.? Properties of Determinants

内容来自书上 5.2 节

Let $A$ and $B$ be $n\times n$ matrices

- $A$ is invertible if and only if $\det A\neq 0$
- $\det AB=(\det A)(\det B)$
- $\det A^T=\det A$
- If $A$ is triangular, then $\det A$ is the product of the entries on the main diagonal of $A$
- A row replacement operation on $A$ does not change the determinant. A row interchange changes the sign of the determinant. A row scaling also scales the determinant by the same scalar factor


