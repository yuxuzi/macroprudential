require(ggplot2)
require(evd)
require(reshape2)
require(plyr)


plot_chi<-function(dat,type, confidences=NULL,nquantile=100)
{
  types=c(chi=1,chibar=2)


  D=chiplot(dat,nq=nquantile,ask=FALSE,which=types[type]  )
  dat0=data.frame(quantile=D$quantile, variable=type,value=D[[type]][,2],confidence=type)#cuo


  
  get_dat=function(conf){
    D=chiplot(dat,conf=conf,ask=FALSE,which=types[type]  )
    dat=data.frame(D$quantile,D[[type]][,c(1,3)])
    names(dat)= c("quantile", paste0(c("low","upp"),conf*100,"%" ))
    res=melt(dat,id="quantile")
    res$confidence=paste0(100*conf,"%")
    res
  }
  
  if(is.null(confidences)) data=dat0
  else{
    dat= ldply(confidences,get_dat)
    data=rbind(dat0,dat)
  }
 
  
  
   ggplot(data=data, aes(x=quantile, y=value, group = variable, colour = confidence,size=confidence, linetype=confidence)) +ylab(type)+
    geom_line() +  scale_size_manual(values=c(0.8,rep(0.4,length(confidences))))+
   theme(panel.background =element_rect(fill="white",color="black") ,legend.position="top", legend.title=element_blank(), axis.title=element_text(size=rel(2)), legend.text=element_text(size=rel(1.8)))
   
   
 
}

get_chi<-function(dat,type,percent=95)
{ types=c(chi=1,chibar=2)
  D=chiplot(dat,nq=1000,ask=FALSE,which=types[type]  )
  res=D[[type]][round(10*percent),2]
}




 