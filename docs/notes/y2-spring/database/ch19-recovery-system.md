## 19.3 Recovery and Atomicity
最常用的恢复方法是log-based recovery

### 19.3.1 Log Records
**log**有很多类型，比如：
- $<T_i,\ X_j, \ V_1,\ V_2>$

    indicating that transaction $T_i$ has performed a write on data item $X_j$. $X_j$ had value $V_1$ before the write and has value $V_2$ after the write
- $<T_i\ \textbf{start}>$

    Transaction $T_i$ has started
- $<T_i\ \textbf{commit}>$

    Transaction $T_i$ has committed

    只有commit了才是真的修改了硬盘的内容 
- $<T_i\ \textbf{abort}>$

    Transaction $T_i$ has aborted 

    被废弃的话那么硬盘就完全不受影响

    

