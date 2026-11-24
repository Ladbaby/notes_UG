```mermaid
stateDiagram

A:使用中
B:待维修
C:待报废

[*]-->A
A-->B:待维修处理
B-->C:待报废申请
A-->C:待报废申请
C-->[*]
```
