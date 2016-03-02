library(xlsx)
library(xts)
dat=read.xlsx( "./Data/SystemCCA-test.xlsx","Put Options")
dates=as.Date(dat[,1])
dat<-as.xts(dat[,-1],order.by = dates)
start=1
Ex_step=1
window=120
step=1
#####
DAT<-LoopMax(dat,start,Ex_step )





res<-Calculate(DAT,window,step)